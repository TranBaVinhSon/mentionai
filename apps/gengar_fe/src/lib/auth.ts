import NextAuth, { DefaultSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { gengarApi } from "@/services/api";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

// Extend the Session interface
declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    userId?: number;
    isFirstLogin?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust host for production deployments - critical for proper redirect URI handling
  trustHost: true,

  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // Use explicit settings to avoid "disallowed_useragent" errors
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  pages: {
    signIn: "/signin",
  },

  session: {
    strategy: "jwt",
    maxAge: dayjs.duration(90, "days").asSeconds(), // 90 days
  },

  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      // Allow access to the home page for all users
      if (
        pathname === "/" ||
        pathname === "/pricing" ||
        pathname === "/commerce-disclosure" ||
        pathname === "/terms-of-service" ||
        pathname === "/privacy" ||
        pathname === "/features" ||
        pathname === "/explore" ||
        pathname === "/community" ||
        pathname === "/models" ||
        pathname === "/use-cases" ||
        pathname.startsWith("/shared/c/") || // Allow access to shared conversations
        pathname.startsWith("/tools") ||
        pathname.match(/^\/@[^\/]+$/) // Allow access to published digital clones /@username
      ) {
        return true;
      }
      // For other routes, require authentication
      return !!auth;
    },

    async jwt({ token, account }) {
      try {
        if (account) {
          const { accessToken, userId, isFirstLogin } = await gengarApi.login({
            email: token.email as string,
            name: token.name as string,
            avatar: token.picture as string,
            sub: token.sub as string,
            source: account.provider as string,
          });

          if (accessToken && userId) {
            token.accessToken = accessToken;
            token.userId = userId;
            token.isFirstLogin = isFirstLogin;
          }
        }
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },

    async session({ session, token }) {
      try {
        if (token.accessToken) {
          session.accessToken = token.accessToken as string;
          session.userId = token.userId as never;
          session.isFirstLogin = token.isFirstLogin as boolean | undefined;
          gengarApi.setApiToken(token.accessToken as string);
        }
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },

    async redirect({ url, baseUrl }) {
      // If it's a relative URL, make it absolute
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // If it's already on the same domain, use it as-is
      if (new URL(url).origin === baseUrl) return url;
      // For external URLs, redirect to home
      return baseUrl;
    },
  },

  // Add debug mode for development
  debug: process.env.NODE_ENV === "development",
});
