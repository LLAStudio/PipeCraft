import { auth } from "@/auth";
import { getOctokitForSession } from "@/lib/github/octokitClient";
import {
  enforceRateLimit,
  logServerError,
  readJsonBody,
  rejectCrossOrigin,
  rejectOversizedBody,
} from "@/lib/security/http";
import { dispatchSchema, repoRefSchema } from "@/lib/security/repoInput";
import { NextRequest, NextResponse } from "next/server";

async function requireGitHub() {
  const session = await auth();
  const userId = session?.user?.id;
  const login = (session?.user as { githubLogin?: string } | undefined)?.githubLogin;
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "Not authenticated. Sign in with GitHub." },
        { status: 401 },
      ),
    } as const;
  }

  const octokit = await getOctokitForSession(userId);
  if (!octokit) {
    return {
      error: NextResponse.json(
        { error: "GitHub account is not linked. Sign in again." },
        { status: 403 },
      ),
    } as const;
  }

  return { octokit, userId, login } as const;
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "github:runs:read", 60, 60_000);
  if (limited) return limited;

  const gh = await requireGitHub();
  if ("error" in gh) return gh.error;

  const params = request.nextUrl.searchParams;
  const parsed = repoRefSchema.safeParse({
    owner: params.get("owner") ?? gh.login ?? "",
    repo: params.get("repo") ?? "",
    branch: params.get("branch") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid repository" },
      { status: 400 },
    );
  }

  try {
    const runs = await gh.octokit.actions.listWorkflowRunsForRepo({
      owner: parsed.data.owner,
      repo: parsed.data.repo,
      ...(parsed.data.branch ? { branch: parsed.data.branch } : {}),
      per_page: 10,
    });

    return NextResponse.json({
      status: "success",
      runs: runs.data.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        created_at: run.created_at,
        head_sha: run.head_sha,
        head_branch: run.head_branch,
        triggered_by: run.display_title,
      })),
    });
  } catch (error) {
    logServerError("GET /api/github/runs", error);
    return NextResponse.json({ status: "error", error: "Failed to fetch runs" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const tooLarge = rejectOversizedBody(request, 64 * 1024);
  if (tooLarge) return tooLarge;

  const limited = enforceRateLimit(request, "github:runs:dispatch", 10, 60_000);
  if (limited) return limited;

  const gh = await requireGitHub();
  if ("error" in gh) return gh.error;

  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok) return body.response;

  const parsed = dispatchSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid dispatch payload" },
      { status: 400 },
    );
  }

  try {
    await gh.octokit.actions.createWorkflowDispatch({
      owner: parsed.data.owner,
      repo: parsed.data.repo,
      workflow_id: parsed.data.workflowFileName,
      ref: parsed.data.branch ?? "main",
      inputs: {},
    });

    return NextResponse.json({ status: "success", message: "Workflow dispatched successfully" });
  } catch (error) {
    logServerError("POST /api/github/runs", error);
    return NextResponse.json({ status: "error", error: "Failed to dispatch workflow" }, { status: 502 });
  }
}
