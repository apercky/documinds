// lib/auth.ts
import type { NextAuthConfig } from "next-auth"; // solo se vuoi autocompletamento, non obbligatorio
import NextAuth from "next-auth";

// AGGIUNGI QUESTI CONSOLE.LOG PER VERIFICA IMMEDIATA
console.log("OIDC_CLIENT_ID:", process.env.OIDC_CLIENT_ID ? "SET" : "NOT SET");
console.log(
  "OIDC_CLIENT_SECRET:",
  process.env.OIDC_CLIENT_SECRET
    ? "SET (length: " + process.env.OIDC_CLIENT_SECRET.length + ")"
    : "NOT SET"
);
console.log("OIDC_ISSUER:", process.env.OIDC_ISSUER ? "SET" : "NOT SET");
console.log(
  "AUTH_SECRET:",
  process.env.AUTH_SECRET
    ? "SET (length: " + process.env.AUTH_SECRET.length + ")"
    : "NOT SET"
);
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL ? "SET" : "NOT SET"); // Anche se NextAuth può inferirlo
console.log("NODE_ENV:", process.env.NODE_ENV);

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
        url: `${process.env.OIDC_ISSUER}/protocol/openid-connect/auth`,
        params: {
          scope:
            process.env.OIDC_SCOPES ?? "openid profile email offline_access",
        },
      },
      token: `${process.env.OIDC_ISSUER}/protocol/openid-connect/token`,
      userinfo: `${process.env.OIDC_ISSUER}/protocol/openid-connect/userinfo`,
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
