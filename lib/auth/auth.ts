// lib/auth.ts
import { jwtDecode } from "jwt-decode";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import { groupPermissions } from "./helper";
import { deleteUserTokens, getUserTokens, storeUserTokens } from "./tokenStore";

const isProd = process.env.NODE_ENV === "production";

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
            process.env.OIDC_SCOPES ?? "openid profile email documinds-scope",
        },
      },
      token: `${process.env.OIDC_ISSUER}/protocol/openid-connect/token`,
      userinfo: `${process.env.OIDC_ISSUER}/protocol/openid-connect/userinfo`,
      checks: ["state"],
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
    maxAge: 1800, // 30 minutes, the same of the refresh token
  },

  secret: process.env.AUTH_SECRET,

  callbacks: {
    async jwt({ token, account, profile }) {
      process.stderr.write(
        `[NextAuth Debug] JWT callback - account present: ${!!account}, profile present: ${!!profile}\n`
      );

      if (account && profile) {
        process.stderr.write(
          `[NextAuth Debug] New login - storing tokens for user: ${profile.sub}\n`
        );
        // Save tokens in Redis
        await storeUserTokens(profile.sub as string, {
          accessToken: account.access_token as string,
          refreshToken: account.refresh_token as string,
          idToken: account.id_token,
          expiresAt: account.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
          brand: profile.brand as string | undefined,
          roles: profile.roles as string[] | undefined,
        });

        token.sub = profile.sub ?? undefined;
        token.idToken = account.id_token;
        token.name = profile.name as string;
        token.email = profile.email as string;
        token.picture = profile.image as string;
        token.emailVerified = profile.emailVerified as Date | null;
      }

      if (token.sub) {
        process.stderr.write(
          `[NextAuth Debug] Checking tokens for user: ${token.sub}\n`
        );
        const tokens = await getUserTokens(token.sub);
        if (tokens) {
          const now = Math.floor(Date.now() / 1000);
          if (tokens.expiresAt < now + 60) {
            process.stderr.write(
              `[NextAuth Debug] Token refresh needed for user: ${token.sub}\n`
            );
            // Refresh token logic
            try {
              const res = await fetch(
                `${process.env.OIDC_ISSUER}/protocol/openid-connect/token`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({
                    client_id: process.env.OIDC_CLIENT_ID ?? "",
                    client_secret: process.env.OIDC_CLIENT_SECRET ?? "",
                    grant_type: "refresh_token",
                    refresh_token: tokens.refreshToken as string,
                  }),
                }
              );

              if (!res.ok) {
                console.error("Token refresh failed with status:", res.status);
                // Clear invalid tokens from Redis
                await deleteUserTokens(token.sub);
                return token; // Return without updated tokens
              }

              const refreshed = await res.json();
              if (res.ok) {
                await storeUserTokens(token.sub, {
                  accessToken: refreshed.access_token,
                  refreshToken:
                    refreshed.refresh_token ?? (tokens.refreshToken as string),
                  idToken: tokens.idToken as string,
                  expiresAt:
                    Math.floor(Date.now() / 1000) +
                    (refreshed.expires_in ?? 3600),
                  brand: tokens.brand as string,
                  roles: tokens.roles as string[],
                });
              } else {
                console.error("Refresh token error", refreshed);
              }
            } catch (err) {
              console.error("Refresh token error", err);
              // Clear invalid tokens from Redis
              await deleteUserTokens(token.sub);
            }
          }
        } else {
          process.stderr.write(
            `[NextAuth Debug] No tokens found in Redis for user: ${token.sub}\n`
          );
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Includi solo i dati essenziali dell'utente e quelli richiesti dal tipo
      // Incluso il brand che è necessario per l'interfaccia esistente
      if (!token.sub) return session;

      const tokens = await getUserTokens(token.sub);
      if (tokens) {
        session.user = {
          id: token.sub as string,
          name: token.name as string,
          email: token.email as string,
          emailVerified: token.emailVerified as Date | null,
          brand: tokens.brand as string, // Aggiungi brand all'oggetto user
        } as any; // Cast per evitare errori TypeScript

        // Aggiungi solo l'ID utente alla sessione per recuperare altri dati
        session.userId = token.sub as string;
        (session as any).roles = tokens.roles;
        // Converti correttamente expiresAt in una data ISO
        session.expires = tokens.expiresAt
          ? (new Date(tokens.expiresAt * 1000) as unknown as Date & string)
          : (new Date(Date.now() + 1800 * 1000) as unknown as Date & string);

        // Mantieni il token per l'utilizzo nel backend (non va nel cookie)
        (session as any).idToken = token.idToken;
        (session as any).oidcIssuer = process.env.OIDC_ISSUER;
      }
      return session;
    },
  },

  cookies: {
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },

  useSecureCookies: isProd,

  trustHost: true,

  debug: process.env.NODE_ENV === "development",
};

// export const { handlers, signIn, signOut, auth } = NextAuth(config);
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...config,
  callbacks: {
    ...config.callbacks,
  },
  // events: {
  //   async signIn(message) {
  //     if (process.env.NODE_ENV === "development") {
  //       console.log("[SignIn Event]", JSON.stringify(message, null, 2));
  //       process.stderr.write(
  //         `[NextAuth Error Event]: ${JSON.stringify(message)}\n`
  //       );
  //     }
  //   },
  //   async signOut(message) {
  //     if (process.env.NODE_ENV === "development") {
  //       console.log("[SignOut Event]", JSON.stringify(message, null, 2));
  //       process.stderr.write(
  //         `[NextAuth Error Event]: ${JSON.stringify(message)}\n`
  //       );
  //     }
  //   },
  // },
});

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
    process.stderr.write(`[NextAuth Error Event]: ${error}\n`);
    return {};
  }
}
