import { octokitClient } from "@/lib/github/octokitClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const branch = searchParams.get("branch") ?? "main";

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Specify owner and repo" },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const octokit = octokitClient as any;
    const { data } = await octokit.repos.getContents({
      owner: owner!,
      repo: repo!,
      path: ".github/workflows",
      ref: branch,
    });

    const workflows: Array<{
      name: string;
      path: string;
      content: string;
      sha: string;
    }> = [];

    for (const file of data as any[]) {
      if (file.type === "file" && (file.name.endsWith(".yml") || file.name.endsWith(".yaml"))) {
        const content = Buffer.from(file.content, "base64").toString("utf-8");
        workflows.push({
          name: file.name,
          path: file.path,
          content,
          sha: file.sha,
        });
      }
    }

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("[GET /api/github/workflows]", error);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, branch, filePath, yamlContent, commitMessage, mode, prTitle, prBody } = body;

    if (!owner || !repo || !filePath || !yamlContent) {
      return NextResponse.json(
        { error: "owner, repo, filePath and yamlContent are required" },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const octokit = octokitClient as any;

    if (mode === "direct_commit") {
      await octokit.repos.createOrUpdateFileContents({
        owner: owner,
        repo: repo,
        path: filePath,
        message: commitMessage || "Update workflow via PipeCraft",
        content: Buffer.from(yamlContent).toString("base64"),
        branch: branch || "main",
      });

      return NextResponse.json({
        success: true,
        message: "Workflow published directly",
      });
    }

    // Create Pull Request
    const timestamp = Date.now();
    const newBranch = `pipecraft/update-${timestamp}`;

    await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch || "main"}`,
    });

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranch}`,
      sha: `refs/heads/${branch || "main"}`,
    });

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage || "Update workflow via PipeCraft",
      content: Buffer.from(yamlContent).toString("base64"),
      branch: newBranch,
    });

    const { data: pullRequest } = await octokit.pulls.create({
      owner,
      repo,
      title: prTitle || "Update workflow via PipeCraft",
      body: prBody || "Workflow updated via PipeCraft visual editor",
      head: newBranch,
      base: branch || "main",
    });

    return NextResponse.json({
      success: true,
      pullRequestUrl: pullRequest.html_url,
      message: "Pull request created",
    });
  } catch (error) {
    console.error("[POST /api/github/workflows]", error);
    return NextResponse.json(
      { error: "Failed to publish workflow" },
      { status: 500 },
    );
  }
}
