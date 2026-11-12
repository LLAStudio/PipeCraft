import { octokitClient } from "@/lib/github/octokitClient";
import { parseActionYaml } from "@/lib/github/actionMetadataParser";
import { NextRequest, NextResponse } from "next/server";

function getPopularActions() {
  return [
    {
      id: "actions/checkout",
      name: "Checkout",
      full_name: "actions/checkout",
      description: "Checks-out your repository under $GITHUB_WORKSPACE, so your workflow can access it.",
      version: "v4",
      icon: "📦",
      category: "Utilities",
    },
    {
      id: "actions/setup-node",
      name: "Setup Node.js",
      full_name: "actions/setup-node",
      description: "Setup a Node.js environment and add it to the PATH.",
      version: "v4",
      icon: "🟢",
      category: "Setup",
    },
    {
      id: "actions/setup-python",
      name: "Setup Python",
      full_name: "actions/setup-python",
      description: "Setup a Python environment and add it to the PATH.",
      version: "v5",
      icon: "🐍",
      category: "Setup",
    },
    {
      id: "actions/cache",
      name: "Cache",
      full_name: "actions/cache",
      description: "Cache dependencies and build outputs to speed up workflows.",
      version: "v4",
      icon: "💾",
      category: "Utilities",
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json({ actions: getPopularActions() });
    }

    const octokit = octokitClient as any;
    const { data } = await octokit.search.code({
      q: `path:action.yml ${q} in:file`,
      sort: "indexed",
      per_page: 15,
    });

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ actions: [] });
    }

    const seenRepos = new Set<string>();
    const actions: Array<{
      id: string;
      name: string;
      full_name: string;
      description: string;
      version: string;
      icon: string;
      category: string;
    }> = [];

    const result = await Promise.all(
      data.items.slice(0, 5).map((item: any) => fetchActionDetails(item, octokit)),
    );

    for (const a of result) {
      if (a && !seenRepos.has(a.full_name)) {
        seenRepos.add(a.full_name);
        actions.push(a);
      }
    }

    return NextResponse.json({ actions });
  } catch (error) {
    console.error("[GET /api/github/marketplace]", error);
    return NextResponse.json(
      { status: "error", error: "Failed to search actions" },
      { status: 500 },
    );
  }
}

async function fetchActionDetails(
  item: any,
  octokit: any,
): Promise<{ id: string; name: string; full_name: string; description: string; version: string; icon: string; category: string; } | null> {
  try {
    const parts = item.path.split("/");
    const repo = parts[0] + "/" + parts[1];
    const file = parts.slice(2).join("/");
    const owner = item.repository.full_name.split("/")[0] ?? "";
    const repoName = repo.split("/")[1];

    const { data: repoData } = await octokit.repos.get({ owner, repo: repoName });
    const { data: actionYaml } = await octokit.repos.getContent({ owner, repo: repoName, path: file });

    const actionContent = Buffer.from(actionYaml.content, "base64").toString("utf-8");
    const metadata = parseActionYaml(actionContent);

    return {
      id: repo,
      name: metadata.name || repo.split("/")[1] || repo,
      full_name: repo,
      description: metadata.description || repoData.description || "",
      version: "main",
      icon: "⚡",
      category: metadata.inputs?.[0]?.description ? "Custom" : "Unknown",
    };
  } catch {
    return null;
  }
}
