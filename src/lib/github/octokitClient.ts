import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/security/crypto";

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
 * Tokens are decrypted from the database; accounts linked before token
 * encryption was introduced are upgraded on first use.
 */
export async function getOctokitForSession(userId: string): Promise<Octokit | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
  });

  if (!account?.access_token) return null;

  // Legacy rows stored the provider token verbatim (no IV/tag). Encrypt it now
  // and use the plaintext value for this request.
  if (!account.access_token_iv || !account.access_token_tag) {
    try {
      const encrypted = encryptToken(account.access_token);
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: encrypted.encrypted,
          access_token_iv: encrypted.iv,
          access_token_tag: encrypted.tag,
        },
      });
      return createOctokit(account.access_token);
    } catch (err) {
      console.error("[getOctokitForSession] Failed to migrate legacy token");
      return null;
    }
  }

  try {
    const token = decryptToken(
      account.access_token,
      account.access_token_iv,
      account.access_token_tag,
    );
    return createOctokit(token);
  } catch (err) {
    console.error("[getOctokitForSession] Failed to decrypt token");
    return null;
  }
}
