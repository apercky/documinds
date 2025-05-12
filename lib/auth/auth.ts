// lib/auth.ts
import { jwtDecode } from "jwt-decode";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import { groupPermissions } from "./helper";

async function getRPT(accessToken: string): Promise<any> {
  const params = new URLSearchParams();
  params.append("grant_type", "urn:ietf:params:oauth:grant-type:uma-ticket");
  params.append("audience", process.env.OIDC_CLIENT_ID || "");

  const response = await fetch(
    `${process.env.OIDC_ISSUER}/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${accessToken}`,
      },
      body: params,
    }
  );

  const data = await response.json();

  if (data.access_token) {
    return jwtDecode(data.access_token);
  }

  return null;
}

// ⚠️ Design Choice:
// We intentionally keep the accessToken and refreshToken inside the JWT session token.
// - accessToken is required for downstream API Gateway calls (BFF pattern).
// - refreshToken is required for token rotation.
// NextAuth will chunk and reassemble session cookies above 4KB automatically.
// This is a conscious trade-off: we prefer stateless session handling (JWT strategy)
// over database-backed sessions, avoiding DB lookups at every request.
// Be aware this increases cookie payload on each request (~3-5KB total).
// Evaluate "strategy: 'database'" only if bandwidth becomes a real bottleneck.

const config: NextAuthConfig = {
  providers: [
    {
      id: "oidc",
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
      profile(profile: any) {
        const isEmailVerified = profile.email_verified === true;
        return {
          id: String(profile.sub),
          name:
            profile.name ?? profile.preferred_username ?? profile.email ?? "",
          email: profile.email ?? "",
          image: profile.picture ?? "",
          emailVerified: isEmailVerified ? new Date() : null,
          brand: profile.brand ?? "default_brand",
          roles: profile.roles ?? [],
        };
      },
    },
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.AUTH_SECRET,

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.id = profile.id as string;
        token.name = profile.name as string;
        token.email = profile.email as string;
        token.picture = profile.image as string;
        token.emailVerified = profile.emailVerified as Date | null;
        token.brand = profile.brand as string;
        token.roles = profile.roles as string[];

        // Salva i token ma non includere le permission nel JWT
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
      // Includi solo i dati essenziali dell'utente e quelli richiesti dal tipo
      // Incluso il brand che è necessario per l'interfaccia esistente
      session.user = {
        id: token.id as string,
        name: token.name as string,
        email: token.email as string,
        emailVerified: token.emailVerified as Date | null,
        brand: token.brand as string, // Aggiungi brand all'oggetto user
        // Non includere accessToken, refreshToken e permissions qui
        // Questo mantiene il cookie piccolo
      } as any; // Cast per evitare errori TypeScript

      // Aggiungi solo l'ID utente alla sessione per recuperare altri dati
      (session as any).userId = token.sub;

      // Mantieni il token per l'utilizzo nel backend (non va nel cookie)
      (session as any).token = token;

      return session;
    },
  },

  debug: process.env.NODE_ENV === "development",
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);

// Utilità per ottenere i permessi - chiamata da /api/me
export async function getUserPermissions(
  accessToken: string | undefined
): Promise<any> {
  if (!accessToken) return {};

  try {
    const rpt = await getRPT(accessToken);
    if (!rpt) return {};

    if (Array.isArray(rpt)) {
      return groupPermissions(rpt);
    } else if (rpt?.authorization?.permissions) {
      return groupPermissions(rpt.authorization.permissions);
    }
    return {};
  } catch (error) {
    console.error("Errore nell'ottenere i permessi:", error);
    return {};
  }
}
