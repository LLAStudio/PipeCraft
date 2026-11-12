import { auth } from "@/auth";
import { octokitClient } from "@/lib/github/octokitClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const maybeSession = await auth();
    const session = (maybeSession as any) ?? {};

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated. Sign in with GitHub." },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get("owner") ?? session.user.login;
    const repo = searchParams.get("repo") ?? "";
    const branch = searchParams.get("branch") ?? "main";

    if (!repo) {
      return NextResponse.json(
        { error: "The 'repo' parameter is required" },
        { status: 400 },
      );
    }

    // Fetch workflow runs
    const runs = await octokitClient.actions.listWorkflowRunsForRepo({
      owner: owner!,
      repo: repo!,
      branch: branch,
      per_page: 10,
    });

    const runsList = runs.data.workflow_runs.map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      created_at: run.created_at,
      head_sha: run.head_sha,
      head_branch: run.head_branch,
      triggered_by: run.display_title,
    }));

    const result = {
      status: "success",
      runs: runsList,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/github/runs]", error);
    return NextResponse.json(
      { status: "error", error: "Failed to fetch runs" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const maybeSession = await auth();
    const session = (maybeSession as any) ?? {};

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated. Sign in with GitHub." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { owner, repo, workflowFileName, branch } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "The 'owner' and 'repo' parameters are required" },
        { status: 400 },
      );
    }

    // Trigger a workflow run
    const octokit = octokitClient;
    await octokit.actions.createWorkflowDispatch({
      owner: owner,
      repo: repo,
      workflow_id: workflowFileName ?? "",
      ref: branch ?? "main",
      inputs: {},
    });

    return NextResponse.json({
      status: "success",
      message: "Workflow dispatched successfully",
    });
  } catch (error) {
    console.error("[POST /api/github/runs]", error);
    return NextResponse.json(
      { status: "error", error: "Failed to dispatch workflow" },
      { status: 500 },
    );
  }
}
