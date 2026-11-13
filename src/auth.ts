import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterAccount } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/security/crypto";

interface JwtToken {
  accessTokenEncrypted?: string;
  accessTokenIv?: string;
  accessTokenTag?: string;
  accessTokenExpires?: number;
  scope?: string;
  githubLogin?: string;
  githubAvatar?: string;
}

interface SessionUserShape {
  id?: string;
  githubLogin?: string;
  githubAvatar?: string;
}

/**
 * GitHub access tokens must never be stored in clear text. The adapter receives
 * the raw provider account, so encrypt the access token before it reaches the
 * database. `getOctokitForSession` decrypts it again for server-side API calls.
 */
function encryptAccountTokens(account: AdapterAccount): AdapterAccount {
  if (typeof account.access_token !== "string" || account.access_token.length === 0) {
    return account;
  }

  const encrypted = encryptToken(account.access_token);
  return {
    ...account,
    access_token: encrypted.encrypted,
    // Extra columns exist on the Account model for the IV and auth tag.
    ...({ access_token_iv: encrypted.iv, access_token_tag: encrypted.tag } as Record<string, string>),
  } as AdapterAccount;
}

const baseAdapter = PrismaAdapter(prisma);

const adapter: Adapter = {
  ...baseAdapter,
  async linkAccount(account) {
    if (!baseAdapter.linkAccount) {
      throw new Error("The configured adapter does not support account linking");
    }
    // Encrypt before the row is written; Auth.js ignores the return value.
    await baseAdapter.linkAccount(encryptAccountTokens(account));
  },
};

export const { handlers, auth } = NextAuth({
  adapter,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      // Only request the scopes the app actually uses. `repo` is required to
      // read private workflow files and to open pull requests.
      authorization: { params: { scope: "read:user user:email repo workflow" } },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // Only the GitHub provider is configured; refuse anything else outright.
      return account?.provider === "github";
    },
    async jwt({ token, account, profile }) {
      const githubAccount = account as
        | { access_token?: string; expires_at?: number; scope?: string }
        | undefined;
      const jwtToken = token as JwtToken;

      if (githubAccount?.access_token) {
        const encrypted = encryptToken(githubAccount.access_token);
        jwtToken.accessTokenEncrypted = encrypted.encrypted;
        jwtToken.accessTokenIv = encrypted.iv;
        jwtToken.accessTokenTag = encrypted.tag;
      }
      if (githubAccount?.expires_at) jwtToken.accessTokenExpires = githubAccount.expires_at;
      if (githubAccount?.scope) jwtToken.scope = githubAccount.scope;

      // Kept in the token (not the session) so API routes can address the
      // signed-in account without trusting a client-provided login.
      const githubProfile = profile as { login?: unknown; avatar_url?: unknown } | undefined;
      if (typeof githubProfile?.login === "string") jwtToken.githubLogin = githubProfile.login;
      if (typeof githubProfile?.avatar_url === "string") jwtToken.githubAvatar = githubProfile.avatar_url;

      return token;
    },
    async session({ session, token }) {
      const jwtToken = token as JwtToken;
      const user = session.user as unknown as SessionUserShape & typeof session.user;

      if (user && token.sub) user.id = token.sub;
      if (user && jwtToken.githubLogin) user.githubLogin = jwtToken.githubLogin;
      if (user && jwtToken.githubAvatar) user.githubAvatar = jwtToken.githubAvatar;

      // Deliberately do NOT expose the GitHub access token on the session:
      // the session object is readable by the browser via /api/auth/session.
      return session;
    },
  },
  pages: { signIn: "/", error: "/" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  // Cookie flags (httpOnly, sameSite=lax, secure) are derived by Auth.js from
  // the deployment URL, so desktop (http://127.0.0.1) and hosted (https) both
  // get valid cookies without hardcoding a prefix.
  debug: false,
});
