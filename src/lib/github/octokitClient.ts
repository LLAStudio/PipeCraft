import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/security/crypto";

const ThrottledOctokit = Octokit.plugin(throttling);

const MAX_RETRIES = 2;

function createOctokit(accessToken: string): Octokit {
  return new ThrottledOctokit({
    auth: accessToken,
    throttle: {
      onRateLimit: (retryAfter, options, _octokit, retryCount) => {
        console.warn(
          `[octokit] rate limit on ${options.method} ${options.url} — retry in ${retryAfter}s`,
        );
        return retryCount < MAX_RETRIES;
      },
      onSecondaryRateLimit: (retryAfter, options, _octokit, retryCount) => {
        console.warn(
          `[octokit] secondary rate limit on ${options.method} ${options.url} — retry in ${retryAfter}s`,
        );
        return retryCount < MAX_RETRIES;
      },
    },
  });
}

/**
 * Anonymous client used for public GitHub data (marketplace actions, public
 * repositories). Authenticated routes must go through `getOctokitForSession`.
 */
export const octokitClient: Octokit = createOctokit(process.env.GITHUB_PUBLIC_TOKEN ?? "");

/**
 * Get an authenticated Octokit instance for a specific user session.
 * This decrypts the stored access token and creates a fresh Octokit client.
 */
export async function getOctokitForSession(userId: string): Promise<Octokit | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
  });

  if (!account?.access_token || !account.access_token_iv || !account.access_token_tag) {
    return null;
  }

  try {
    const token = decryptToken(
      account.access_token,
      account.access_token_iv,
      account.access_token_tag,
    );
    return createOctokit(token);
  } catch (err) {
    console.error("[getOctokitForSession] Failed to decrypt token:", err);
    return null;
  }
}
