import { NextResponse, type NextRequest } from "next/server";

/**
 * The editor validates YAML against JSON schemas with Ajv, which compiles
 * validators with `new Function`. That needs `'unsafe-eval'`, so the editor
 * routes get a slightly relaxed policy while every other page stays strict.
 */
function buildCsp(allowEval: boolean): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // Hosted previews embed the app in an iframe; nothing else may frame it.
    "frame-ancestors 'self' https://*.style.dev",
    "form-action 'self'",
    "img-src 'self' data: blob: https://avatars.githubusercontent.com https://*.githubusercontent.com",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    // Monaco (YAML editor) is still delivered by @monaco-editor/react from jsDelivr.
    `script-src 'self' 'unsafe-inline'${allowEval ? " 'unsafe-eval'" : ""} https://cdn.jsdelivr.net`,
    "connect-src 'self' https://api.github.com",
    "worker-src 'self' blob: https://cdn.jsdelivr.net",
    "manifest-src 'self'",
  ].join("; ");
}

const STRICT_CSP = buildCsp(false);
const EDITOR_CSP = buildCsp(true);

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isEditor = request.nextUrl.pathname === "/editor" || request.nextUrl.pathname.startsWith("/editor/");

  response.headers.set("Content-Security-Policy", isEditor ? EDITOR_CSP : STRICT_CSP);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");

  return response;
}

export const config = {
  // Static assets are immutable and served with their own caching headers.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)$).*)"],
};
