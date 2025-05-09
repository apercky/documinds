// lib/auth.ts
import type { NextAuthConfig } from "next-auth"; // solo se vuoi autocompletamento, non obbligatorio
import NextAuth from "next-auth";

const config: NextAuthConfig = {
  providers: [
    {
      id: "oidc", // puoi usare "keycloak" o "netiq" se preferisci
      name: "OIDC Provider",
      type: "oauth",
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      issuer: process.env.OIDC_ISSUER,
      wellKnown: `${process.env.OIDC_ISSUER}/.well-known/openid-configuration`,
      authorization: {
        params: {
          scope:
            process.env.OIDC_SCOPES ?? "openid profile email offline_access",
          client_id: process.env.OIDC_CLIENT_ID,
        },
      },
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username ?? profile.email,
          email: profile.email,
        };
      },
    },
  ],

  session: {
    strategy: "jwt",
  },

  secret: process.env.AUTH_SECRET,

  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt =
          account.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
      }

      const now = Math.floor(Date.now() / 1000);
      if (token.expiresAt && now < (token.expiresAt as number)) {
        return token;
      }

      // Refresh token
      try {
        const res = await fetch(
          `${process.env.OIDC_ISSUER}/protocol/openid-connect/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.OIDC_CLIENT_ID ?? "",
              client_secret: process.env.OIDC_CLIENT_SECRET ?? "",
              grant_type: "refresh_token",
              refresh_token: token.refreshToken as string,
            }),
          }
        );

        const refreshed = await res.json();
        if (!res.ok) throw refreshed;

        token.accessToken = refreshed.access_token;
        token.refreshToken = refreshed.refresh_token ?? token.refreshToken;
        token.expiresAt =
          Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600);
      } catch (err) {
        console.error("Refresh token error", err);
        token.error = "RefreshAccessTokenError";
      }

      return token;
    },

    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken,
        error: token.error,
      };
    },
  },

  debug: process.env.NODE_ENV === "development",
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
