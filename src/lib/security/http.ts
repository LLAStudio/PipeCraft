import { NextResponse } from "next/server";

/**
 * Minimal in-memory rate limiter.
 *
 * The app runs either as a single desktop process or as a small standalone
 * server, so a process-local sliding window is enough to stop accidental or
 * opportunistic abuse without adding an external dependency. Multi-instance
 * deployments should put a shared limiter in front of the app.
 */
interface RateBucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  __pipecraftRateLimit?: Map<string, RateBucket>;
};

const buckets = (globalForRateLimit.__pipecraftRateLimit ??= new Map<string, RateBucket>());

const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > MAX_TRACKED_KEYS) {
      for (const [candidate, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(candidate);
      }
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "local";
  return `${scope}:${ip}`;
}

/** Returns a 429 response when the caller exceeded its budget, otherwise null. */
export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const result = rateLimit(clientKey(request, scope), limit, windowMs);
  if (result.allowed) return null;

  return NextResponse.json(
    { error: "Too many requests. Please retry shortly." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

/**
 * Rejects cross-site state-changing requests. Browsers always send `Origin` for
 * POST/PATCH/DELETE, so a mismatching host or a `cross-site` fetch metadata
 * marker means the request did not come from the app itself. Requests without
 * either header (CLI clients, server-to-server) still rely on SameSite cookies.
 */
export function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function rejectCrossOrigin(request: Request): NextResponse | null {
  if (isSameOriginRequest(request)) return null;
  return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
}

export const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;

/** Cheap guard against oversized JSON payloads before they are parsed. */
export function rejectOversizedBody(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): NextResponse | null {
  const length = request.headers.get("content-length");
  if (!length) return null;

  const parsed = Number(length);
  if (!Number.isFinite(parsed) || parsed <= maxBytes) return null;

  return NextResponse.json({ error: "Request body too large" }, { status: 413 });
}

/**
 * Reads a JSON body while enforcing a hard byte cap, so a client that omits
 * Content-Length cannot force the server to buffer an arbitrarily large body.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  if (!request.body) {
    return { ok: false, response: NextResponse.json({ error: "JSON body required" }, { status: 400 }) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, response: NextResponse.json({ error: "Request body too large" }, { status: 413 }) };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Could not read request body" }, { status: 400 }) };
  }

  try {
    const text = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf-8");
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
}

/**
 * Logs only the error message and status, never the whole error object: Octokit
 * errors carry the outgoing request (including the Authorization header), and
 * those must not end up in server logs.
 */
export function logServerError(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: unknown } | null)?.status;
  console.error(`[${scope}]`, {
    ...(typeof status === "number" ? { status } : {}),
    message: message.replace(/\s+/g, " ").slice(0, 300),
  });
}
