import { auth } from "@/auth";
import { getOctokitForSession } from "@/lib/github/octokitClient";
import { enforceRateLimit, logServerError } from "@/lib/security/http";
import { NextRequest, NextResponse } from "next/server";

const MAX_PER_PAGE = 100;
const MAX_PAGE = 100;
const MAX_QUERY_LENGTH = 100;

function readBoundedInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "github:repos", 60, 60_000);
  if (limited) return limited;

  const session = await auth();
  const userId = session?.user?.id;
  const login = (session?.user as { githubLogin?: string } | undefined)?.githubLogin;

  if (!userId) {
    return NextResponse.json(
      { error: "Not authenticated. Sign in with GitHub." },
      { status: 401 },
    );
  }
  if (!login) {
    return NextResponse.json(
      { error: "GitHub login unavailable. Sign in again." },
      { status: 403 },
    );
  }

  const octokit = await getOctokitForSession(userId);
  if (!octokit) {
    return NextResponse.json(
      { error: "GitHub account is not linked. Sign in again." },
      { status: 403 },
    );
  }

  const params = request.nextUrl.searchParams;
  const perPage = readBoundedInt(params.get("per_page"), 30, 1, MAX_PER_PAGE);
  const page = readBoundedInt(params.get("page"), 1, 1, MAX_PAGE);
  const query = (params.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);

  try {
    if (query) {
      const { data } = await octokit.search.repos({
        q: `user:${login} ${query}`,
        sort: "updated",
        order: "desc",
        per_page: perPage,
        page,
      });
      return NextResponse.json({
        repos: data.items.map(formatRepo),
        totalCount: data.total_count,
        page,
        perPage,
        hasNextPage: data.items.length === perPage,
      });
    }

    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      direction: "desc",
      per_page: perPage,
      page,
    });

    return NextResponse.json({
      repos: data.map(formatRepo),
      totalCount: data.length,
      page,
      perPage,
      hasNextPage: data.length === perPage,
    });
  } catch (error) {
    logServerError("GET /api/github/repos", error);
    return NextResponse.json({ error: "Could not fetch repositories" }, { status: 502 });
  }
}

interface RepoLike {
  full_name: string;
  name: string;
  private?: boolean;
  default_branch?: string;
  pushed_at?: string | null;
  description?: string | null;
  html_url?: string;
  owner?: { login?: string } | null;
}

function formatRepo(repo: RepoLike) {
  return {
    fullName: repo.full_name,
    owner: repo.owner?.login ?? repo.full_name.split("/")[0] ?? "",
    name: repo.name,
    isPrivate: Boolean(repo.private),
    defaultBranch: repo.default_branch ?? "main",
    pushedAt: repo.pushed_at ?? null,
    description: repo.description ?? "",
    htmlUrl: repo.html_url ?? "",
  };
}
