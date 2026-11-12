import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/security/crypto";

interface GitHubAccount {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
}

interface JwtToken {
  accessTokenEncrypted?: string;
  accessTokenIv?: string;
  accessTokenTag?: string;
  refreshTokenEncrypted?: string;
  refreshTokenIv?: string;
  refreshTokenTag?: string;
  accessTokenExpires?: number;
  scope?: string;
  githubLogin?: string;
  githubAvatar?: string;
}

interface SessionShape {
  user?: { id?: string; githubLogin?: string; githubAvatar?: string };
  accessToken?: string | undefined;
  expires: string;
}

export const { handlers, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider !== "github") return false;
      return true;
    },
    async jwt({ token, account }) {
      const githubAccount = account as GitHubAccount | undefined;
      const jwtToken = token as JwtToken;

      if (githubAccount?.access_token) {
        const encrypted = encryptToken(githubAccount.access_token);
        jwtToken.accessTokenEncrypted = encrypted.encrypted;
        jwtToken.accessTokenIv = encrypted.iv;
        jwtToken.accessTokenTag = encrypted.tag;
      }
      if (githubAccount?.refresh_token) {
        const encrypted = encryptToken(githubAccount.refresh_token);
        jwtToken.refreshTokenEncrypted = encrypted.encrypted;
        jwtToken.refreshTokenIv = encrypted.iv;
        jwtToken.refreshTokenTag = encrypted.tag;
      }
      if (githubAccount?.expires_at) jwtToken.accessTokenExpires = githubAccount.expires_at;
      if (githubAccount?.scope) jwtToken.scope = githubAccount.scope;

      return token;
    },
    async session({ session, token }) {
      const jwtToken = token as JwtToken;
      const shaped = session as unknown as SessionShape;

      if (shaped.user && jwtToken.accessTokenEncrypted) {
        try {
          shaped.accessToken = decryptToken(
            jwtToken.accessTokenEncrypted,
            jwtToken.accessTokenIv ?? "",
            jwtToken.accessTokenTag ?? "",
          );
        } catch {
          shaped.accessToken = undefined;
        }
      }
      if (shaped.user && token.sub) shaped.user.id = token.sub;
      if (jwtToken.githubLogin && shaped.user) shaped.user.githubLogin = jwtToken.githubLogin;
      if (jwtToken.githubAvatar && shaped.user) shaped.user.githubAvatar = jwtToken.githubAvatar;

      return session;
    },
  },
  pages: { signIn: "/", error: "/" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  debug: process.env.NODE_ENV === "development",
});
