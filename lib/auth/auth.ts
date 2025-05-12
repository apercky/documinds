// lib/auth.ts
import { jwtDecode } from "jwt-decode";
import type { NextAuthConfig } from "next-auth"; // solo se vuoi autocompletamento, non obbligatorio
import NextAuth from "next-auth";
import { groupPermissions } from "./helper";

// AGGIUNGI QUESTI CONSOLE.LOG PER VERIFICA IMMEDIATA
// console.log("OIDC_CLIENT_ID:", process.env.OIDC_CLIENT_ID ? "SET" : "NOT SET");
// console.log(
//   "OIDC_CLIENT_SECRET:",
//   process.env.OIDC_CLIENT_SECRET
//     ? "SET (length: " + process.env.OIDC_CLIENT_SECRET.length + ")"
//     : "NOT SET"
// );
// console.log("OIDC_ISSUER:", process.env.OIDC_ISSUER ? "SET" : "NOT SET");
// console.log(
//   "AUTH_SECRET:",
//   process.env.AUTH_SECRET
//     ? "SET (length: " + process.env.AUTH_SECRET.length + ")"
//     : "NOT SET"
// );
// console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL ? "SET" : "NOT SET"); // Anche se NextAuth può inferirlo
// console.log("NODE_ENV:", process.env.NODE_ENV);

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
          roles: profile.realm_roles ?? [],
          permissions: profile.client_permissions ?? [],
        };
      },
    },
  ],

  session: {
    strategy: "jwt",
  },

  secret: process.env.AUTH_SECRET,

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt =
          account.expires_at ?? Math.floor(Date.now() / 1000) + 3600;

        token.id = profile.id as string;
        token.name = profile.name as string;
        token.email = profile.email as string;
        token.picture = profile.image as string;
        token.emailVerified = profile.emailVerified as Date | null;
        token.brand = profile.brand as string;
        token.roles = profile.roles as string[];

        // 🔄 Recupera RPT subito dopo il login
        const rpt = await getRPT(account.access_token ?? "");
        // console.log(
        //   "RPT Authorization response:",
        //   JSON.stringify(rpt, null, 2)
        // );

        if (rpt) {
          // Store the raw permissions response
          console.log("permissionsRaw:", rpt);

          try {
            // If the response is already an array of permission objects, use it directly
            if (Array.isArray(rpt)) {
              token.permissions = groupPermissions(rpt);
            }
            // If the response has an authorization.permissions structure (traditional UMA format)
            else if (rpt?.authorization?.permissions) {
              token.permissions = groupPermissions(
                rpt.authorization.permissions
              );
            }
            // Fallback to empty permissions if neither format is found
            else {
              token.permissions = {};
              console.warn("No permissions found in RPT response");
            }
          } catch (error) {
            console.error("Error processing permissions:", error);
            token.permissions = {}; // Set an empty permissions object as fallback
          }
        }
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
      // Base user properties with permissions fully included
      const baseUser: any = {
        id: typeof token.id === "string" ? token.id : String(token.id ?? ""),
        name: (token.name as string) ?? "",
        email: (token.email as string) ?? "",
        image: (token.picture as string) ?? "",
        emailVerified: token.emailVerified as Date | null,
        // 🔥 NON includere le permissions nel cookie
        // permissions: token.permissions as StructuredPermissions | undefined,
      };

      // Add brand and roles
      if (token.brand) {
        baseUser.brand = token.brand as string;
      }
      if (token.roles) {
        baseUser.roles = token.roles as string[];
      }

      session.user = baseUser;

      // Keep the full access token since you need it for external service calls
      (session as any).accessToken = token.accessToken as string | undefined;
      (session as any).error = token.error as string | undefined;

      return session;
    },
  },

  debug: process.env.NODE_ENV === "development",
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
