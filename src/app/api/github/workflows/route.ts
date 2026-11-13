import { auth } from "@/auth";
import { getOctokitForSession } from "@/lib/github/octokitClient";
import {
  enforceRateLimit,
  logServerError,
  readJsonBody,
  rejectCrossOrigin,
  rejectOversizedBody,
} from "@/lib/security/http";
import { publishSchema, repoRefSchema } from "@/lib/security/repoInput";
import { NextRequest, NextResponse } from "next/server";

const READ_LIMIT = { limit: 60, windowMs: 60_000 };
const WRITE_LIMIT = { limit: 20, windowMs: 60_000 };

async function requireGitHub() {
  const session = await auth();
  const userId = session?.user?.id;
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

  return { octokit, userId } as const;
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "github:workflows:read", READ_LIMIT.limit, READ_LIMIT.windowMs);
  if (limited) return limited;

  const gh = await requireGitHub();
  if ("error" in gh) return gh.error;

  const params = request.nextUrl.searchParams;
  const parsed = repoRefSchema.safeParse({
    owner: params.get("owner") ?? "",
    repo: params.get("repo") ?? "",
    branch: params.get("branch") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid repository" },
      { status: 400 },
    );
  }

  const { owner, repo } = parsed.data;
  const branch = parsed.data.branch ?? "main";

  try {
    const { data } = await gh.octokit.repos.getContent({
      owner,
      repo,
      path: ".github/workflows",
      ref: branch,
    });

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Unexpected GitHub response" }, { status: 502 });
    }

    const workflows: Array<{ name: string; path: string; content: string; sha: string }> = [];

    for (const file of data) {
      if (file.type !== "file" || !/\.ya?ml$/.test(file.name)) continue;
      const { data: fileData } = await gh.octokit.repos.getContent({
        owner,
        repo,
        path: file.path,
        ref: branch,
      });
      if (Array.isArray(fileData) || !("content" in fileData) || !fileData.content) continue;
      workflows.push({
        name: file.name,
        path: file.path,
        content: Buffer.from(fileData.content, "base64").toString("utf-8"),
        sha: file.sha ?? fileData.sha,
      });
    }

    return NextResponse.json({ workflows });
  } catch (error) {
    logServerError("GET /api/github/workflows", error);
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const tooLarge = rejectOversizedBody(request, 1024 * 1024);
  if (tooLarge) return tooLarge;

  const limited = enforceRateLimit(request, "github:workflows:write", WRITE_LIMIT.limit, WRITE_LIMIT.windowMs);
  if (limited) return limited;

  const gh = await requireGitHub();
  if ("error" in gh) return gh.error;

  const body = await readJsonBody(request, 1024 * 1024);
  if (!body.ok) return body.response;

  const parsed = publishSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid workflow payload" },
      { status: 400 },
    );
  }

  const { owner, repo, filePath, yamlContent, commitMessage, mode, prTitle, prBody } = parsed.data;
  const branch = parsed.data.branch ?? "main";

  try {
    if ((mode ?? "direct_commit") === "direct_commit") {
      await gh.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: commitMessage || "Update workflow via PipeCraft",
        content: Buffer.from(yamlContent, "utf-8").toString("base64"),
        branch,
      });

      return NextResponse.json({ success: true, message: "Workflow published directly" });
    }

    const newBranch = `pipecraft/update-${Date.now()}`;

    const { data: baseRef } = await gh.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    await gh.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranch}`,
      sha: baseRef.object.sha,
    });

    await gh.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage || "Update workflow via PipeCraft",
      content: Buffer.from(yamlContent, "utf-8").toString("base64"),
      branch: newBranch,
    });

    const { data: pullRequest } = await gh.octokit.pulls.create({
      owner,
      repo,
      title: prTitle || "Update workflow via PipeCraft",
      body: prBody || "Workflow updated via PipeCraft visual editor",
      head: newBranch,
      base: branch,
    });

    return NextResponse.json({
      success: true,
      pullRequestUrl: pullRequest.html_url,
      message: "Pull request created",
    });
  } catch (error) {
    logServerError("POST /api/github/workflows", error);
    return NextResponse.json({ error: "Failed to publish workflow" }, { status: 502 });
  }
}
