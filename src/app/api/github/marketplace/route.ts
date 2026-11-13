import { octokitClient } from "@/lib/github/octokitClient";
import { parseActionYaml } from "@/lib/github/actionMetadataParser";
import { enforceRateLimit, logServerError } from "@/lib/security/http";
import { NextRequest, NextResponse } from "next/server";

const MAX_QUERY_LENGTH = 80;
const REPO_PART_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const FILE_PATH_PATTERN = /^[A-Za-z0-9._/-]{1,200}$/;

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
  const limited = enforceRateLimit(request, "github:marketplace", 20, 60_000);
  if (limited) return limited;

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  if (!q) {
    return NextResponse.json({ actions: getPopularActions() });
  }

  try {
    const { data } = await octokitClient.search.code({
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

    // Never follow paths from the search response blindly: only accept a plain
    // owner/repo/path shape so the follow-up API calls stay inside GitHub.
    const candidates = data.items.filter((item) => {
      const parts = item.path.split("/");
      return (
        parts.length >= 3 &&
        REPO_PART_PATTERN.test(parts[0] ?? "") &&
        REPO_PART_PATTERN.test(parts[1] ?? "") &&
        FILE_PATH_PATTERN.test(parts.slice(2).join("/")) &&
        !parts.some((part) => part === ".." || part === ".")
      );
    });

    const result = await Promise.all(
      candidates.slice(0, 5).map((item) => fetchActionDetails(item)),
    );

    for (const action of result) {
      if (action && !seenRepos.has(action.full_name)) {
        seenRepos.add(action.full_name);
        actions.push(action);
      }
    }

    return NextResponse.json({ actions });
  } catch (error) {
    logServerError("GET /api/github/marketplace", error);
    return NextResponse.json({ status: "error", error: "Failed to search actions" }, { status: 502 });
  }
}

async function fetchActionDetails(
  item: { path: string; repository: { full_name: string } },
): Promise<{ id: string; name: string; full_name: string; description: string; version: string; icon: string; category: string } | null> {
  try {
    const parts = item.path.split("/");
    const owner = item.repository.full_name.split("/")[0] ?? "";
    const repoName = parts[1] ?? "";
    const file = parts.slice(2).join("/");

    if (!REPO_PART_PATTERN.test(owner) || !REPO_PART_PATTERN.test(repoName) || !FILE_PATH_PATTERN.test(file)) {
      return null;
    }

    const repoFullName = `${owner}/${repoName}`;

    const { data: repoData } = await octokitClient.repos.get({ owner, repo: repoName });
    const { data: actionYaml } = await octokitClient.repos.getContent({ owner, repo: repoName, path: file });

    if (Array.isArray(actionYaml) || !("content" in actionYaml) || !actionYaml.content) return null;

    const actionContent = Buffer.from(actionYaml.content, "base64").toString("utf-8");
    const metadata = parseActionYaml(actionContent);

    return {
      id: repoFullName,
      name: metadata.name || repoName || repoFullName,
      full_name: repoFullName,
      description: metadata.description || repoData.description || "",
      version: "main",
      icon: "⚡",
      category: metadata.inputs?.[0]?.description ? "Custom" : "Unknown",
    };
  } catch {
    return null;
  }
}
