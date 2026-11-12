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
    const perPage = Math.min(100, parseInt(searchParams.get("per_page") ?? "30"));
    const page = parseInt(searchParams.get("page") ?? "1");
    const query = searchParams.get("q")?.trim() ?? "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const octokit = octokitClient as any;
    let repos;
    if (query) {
      const { data } = await octokit.search.repos({
        q: `user:${session.user.login} ${query}`,
        sort: "pushed",
        order: "desc",
        per_page: perPage,
        page,
      });
      repos = data.items;
    } else {
      const { data } = await octokit.search.repos.listForUser({
        username: session.user.login,
        sort: "pushed",
        per_page: perPage,
        page,
      });
      repos = data;
    }

    const formatted = repos.map((repo: any) => ({
      fullName: repo.full_name,
      owner: repo.owner.login,
      name: repo.name,
      isPrivate: repo.private,
      defaultBranch: repo.default_branch,
      pushedAt: repo.pushed_at,
      description: repo.description,
      htmlUrl: repo.html_url,
    }));

    return NextResponse.json({
      repos: formatted,
      totalCount: repos.length === 0 ? 0 : repos.length,
      page,
      perPage,
      hasNextPage: repos.length === perPage,
    });
  } catch (error) {
    console.error("[GET /api/github/repos]", error);
    return NextResponse.json(
      { error: "Could not fetch repositories" },
      { status: 500 },
    );
  }
}
