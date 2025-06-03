// lib/auth.ts
import { debugLog, isDebugEnabled } from "@/lib/utils/debug-logger";
import { jwtDecode } from "jwt-decode";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import { AUTH_CONFIG } from "./config";
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
    maxAge: AUTH_CONFIG.session.maxAgeSeconds,
  },

  secret: process.env.AUTH_SECRET,

  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      const now = Math.floor(Date.now() / 1000);
      const callbackId = `jwt-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)}`;

      debugLog(`🔄 [${callbackId}] JWT CALLBACK START`);
      debugLog(`   ├── Trigger: ${trigger || "undefined"}`);
      debugLog(`   ├── Account present: ${!!account}`);
      debugLog(`   ├── Profile present: ${!!profile}`);
      debugLog(`   ├── Token sub: ${token?.sub || "undefined"}`);
      debugLog(`   └── Timestamp: ${now}`);

      if (account && profile) {
        debugLog(
          `🆕 [${callbackId}] NEW LOGIN detected for user: ${profile.sub}`
        );

        try {
          await storeUserTokens(profile.sub as string, {
            accessToken: account.access_token as string,
            refreshToken: account.refresh_token as string,
            idToken: account.id_token,
            expiresAt:
              account.expires_at ??
              Math.floor(Date.now() / 1000) +
                AUTH_CONFIG.tokens.defaultExpirySeconds,
            brand: profile.brand as string | undefined,
            roles: profile.roles as string[] | undefined,
          });

          debugLog(
            `✅ [${callbackId}] Tokens stored successfully for new login`
          );
        } catch (error) {
          debugLog(
            `❌ [${callbackId}] Failed to store tokens for new login: ${error}`
          );
        }

        token.sub = profile.sub ?? undefined;
        token.idToken = account.id_token;
        token.name = profile.name as string;
        token.email = profile.email as string;
        token.picture = profile.image as string;
        token.emailVerified = profile.emailVerified as Date | null;
      }

      if (token.sub) {
        debugLog(
          `🔍 [${callbackId}] Checking existing tokens for user: ${token.sub}`
        );

        const tokens = await getUserTokens(token.sub);

        if (tokens) {
          const timeToExpiry = tokens.expiresAt - now;
          debugLog(`📊 [${callbackId}] Token status:`);
          debugLog(
            `   ├── Expires at: ${tokens.expiresAt} (${new Date(
              tokens.expiresAt * 1000
            ).toISOString()})`
          );
          debugLog(
            `   ├── Current time: ${now} (${new Date(
              now * 1000
            ).toISOString()})`
          );
          debugLog(`   ├── Time to expiry: ${timeToExpiry}s`);
          debugLog(
            `   ├── Refresh needed: ${
              timeToExpiry < AUTH_CONFIG.tokens.refreshThresholdSeconds
                ? "YES"
                : "NO"
            }`
          );
          debugLog(`   └── Has refresh token: ${!!tokens.refreshToken}`);

          if (
            tokens.expiresAt <
            now + AUTH_CONFIG.tokens.refreshThresholdSeconds
          ) {
            debugLog(
              `🔄 [${callbackId}] TOKEN REFRESH NEEDED (expires in ${timeToExpiry}s)`
            );

            // Implement Redis lock to prevent parallel refresh attempts
            const lockKey = `refresh_lock:${token.sub}`;
            const lockValue = callbackId;
            const lockTTL = AUTH_CONFIG.lock.timeoutSeconds;

            try {
              // Try to acquire lock (SET if not exists with expiry)
              const {
                getUserTokens: _getUserTokens,
                storeUserTokens: _storeUserTokens,
                deleteUserTokens: _deleteUserTokens,
                getRedisClient,
              } = await import("./tokenStore");
              const redis = getRedisClient();

              const lockAcquired = await redis.set(
                lockKey,
                lockValue,
                "EX",
                lockTTL,
                "NX"
              );

              if (!lockAcquired) {
                debugLog(
                  `🔒 [${callbackId}] REFRESH ALREADY IN PROGRESS - waiting for completion`
                );

                // Wait for the other refresh to complete (configurable max wait time)
                let waitCount = 0;
                while (waitCount < AUTH_CONFIG.lock.maxWaitSeconds) {
                  await new Promise((resolve) =>
                    setTimeout(resolve, AUTH_CONFIG.lock.waitIntervalMs)
                  );
                  waitCount++;

                  // Check if tokens were updated by the other process
                  const updatedTokens = await getUserTokens(token.sub);
                  if (
                    updatedTokens &&
                    updatedTokens.expiresAt >
                      now + AUTH_CONFIG.tokens.refreshThresholdSeconds
                  ) {
                    debugLog(
                      `✅ [${callbackId}] Token was refreshed by another process - using updated tokens`
                    );
                    debugLog(
                      `   └── New expiry: ${
                        updatedTokens.expiresAt
                      } (${new Date(
                        updatedTokens.expiresAt * 1000
                      ).toISOString()})`
                    );
                    return token;
                  }
                }

                debugLog(
                  `⚠️ [${callbackId}] Timeout waiting for other refresh - proceeding anyway`
                );
                return token;
              }

              debugLog(
                `🔓 [${callbackId}] Lock acquired - proceeding with refresh`
              );
              debugLog(
                `📤 [${callbackId}] Sending refresh request to Keycloak...`
              );
              debugLog(
                `   └── Refresh token (first ${
                  AUTH_CONFIG.debug.tokenLogLength
                } chars): ${tokens.refreshToken?.substring(
                  0,
                  AUTH_CONFIG.debug.tokenLogLength
                )}...`
              );

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

              debugLog(
                `📥 [${callbackId}] Keycloak response status: ${res.status}`
              );

              const refreshed = await res.json();
              if (res.ok) {
                debugLog(`✅ [${callbackId}] REFRESH SUCCESS - got new tokens`);
                debugLog(
                  `   ├── New access token (first ${
                    AUTH_CONFIG.debug.tokenLogLength
                  } chars): ${refreshed.access_token?.substring(
                    0,
                    AUTH_CONFIG.debug.tokenLogLength
                  )}...`
                );
                debugLog(
                  `   ├── New refresh token (first ${
                    AUTH_CONFIG.debug.tokenLogLength
                  } chars): ${refreshed.refresh_token?.substring(
                    0,
                    AUTH_CONFIG.debug.tokenLogLength
                  )}...`
                );
                debugLog(`   └── Expires in: ${refreshed.expires_in}s`);

                await storeUserTokens(token.sub, {
                  accessToken: refreshed.access_token,
                  refreshToken:
                    refreshed.refresh_token ?? (tokens.refreshToken as string),
                  idToken: tokens.idToken as string,
                  expiresAt:
                    Math.floor(Date.now() / 1000) +
                    (refreshed.expires_in ??
                      AUTH_CONFIG.tokens.defaultExpirySeconds),
                  brand: tokens.brand as string,
                  roles: tokens.roles as string[],
                });

                debugLog(`💾 [${callbackId}] Updated tokens stored in Redis`);
                debugLog(
                  `   └── New expiry: ${
                    Math.floor(Date.now() / 1000) +
                    (refreshed.expires_in ??
                      AUTH_CONFIG.tokens.defaultExpirySeconds)
                  } (${new Date(
                    (Math.floor(Date.now() / 1000) +
                      (refreshed.expires_in ??
                        AUTH_CONFIG.tokens.defaultExpirySeconds)) *
                      1000
                  ).toISOString()})`
                );
              } else {
                debugLog(`❌ [${callbackId}] REFRESH FAILED:`);
                debugLog(`   ├── Status: ${res.status} ${res.statusText}`);
                debugLog(`   ├── Error body: ${JSON.stringify(refreshed)}`);
                debugLog(`   └── Deleting invalid tokens from Redis...`);

                await deleteUserTokens(token.sub);
                debugLog(
                  `🗑️ [${callbackId}] Tokens deleted from Redis due to refresh failure`
                );
              }

              // Always release the lock
              await redis.del(lockKey);
              debugLog(`🔓 [${callbackId}] Lock released`);
            } catch (err) {
              debugLog(`💥 [${callbackId}] REFRESH EXCEPTION:`);
              debugLog(`   ├── Error: ${err}`);
              debugLog(`   └── Deleting tokens from Redis...`);

              await deleteUserTokens(token.sub);
              debugLog(
                `🗑️ [${callbackId}] Tokens deleted from Redis due to exception`
              );

              // Release lock on error
              try {
                const { getRedisClient } = await import("./tokenStore");
                const redis = getRedisClient();
                await redis.del(lockKey);
                debugLog(`🔓 [${callbackId}] Lock released after error`);
              } catch (lockErr) {
                debugLog(
                  `⚠️ [${callbackId}] Failed to release lock: ${lockErr}`
                );
              }
            }
          } else {
            debugLog(
              `⏭️ [${callbackId}] No refresh needed - token valid for ${timeToExpiry}s`
            );
          }
        } else {
          debugLog(
            `⚠️ [${callbackId}] NO TOKENS FOUND IN REDIS for user: ${token.sub}`
          );
          debugLog(
            `   └── This indicates Redis tokens expired or were deleted`
          );
        }
      }

      debugLog(`🏁 [${callbackId}] JWT CALLBACK END - returning token`);
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

  debug: process.env.NODE_ENV === "development" && isDebugEnabled(),
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
  //       debugLog("[SignIn Event]", JSON.stringify(message, null, 2));
  //     }
  //   },
  //   async signOut(message) {
  //     if (process.env.NODE_ENV === "development") {
  //       debugLog("[SignOut Event]", JSON.stringify(message, null, 2));
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
    debugLog("Errore nell'ottenere i permessi:", error);
    return {};
  }
}
