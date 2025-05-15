import "server-only";

import { auth } from "@/lib/auth/auth";
import { getUserTokens } from "@/lib/auth/tokenStore";
import type { Session } from "next-auth";
import { getToken, JWT } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Definizione più precisa di tipi per handler appropriati
type NextRequestHandler<T = unknown> = (
  req: NextRequest,
  context?: T
) => Promise<Response | NextResponse>;

type RequestHandler<T = unknown> = (
  req: Request,
  context?: T
) => Promise<Response | NextResponse>;

type Handler<T = unknown> = NextRequestHandler<T> | RequestHandler<T>;

/**
 * Interface for the authentication context passed to route handlers
 *
 * This context is automatically passed to the handler function when using withAuth
 * and contains all the authentication information needed for the route
 */
export interface AuthContext {
  /** The user's access token for API calls */
  accessToken: string;
  /** The user's refresh token */
  refreshToken: string;
  /** The user's ID token */
  idToken: string;
  /** The user's ID (sub) */
  userId: string;
  /** The user's brand */
  brand: string;
  /** The user's roles */
  roles: string[];
  /** The user's session */
  session: Session | null;
  /** The user's JWT token */
  token: JWT | null;
}

/**
 * Interceptor per proteggere le route con autenticazione e controllo ruoli
 *
 * @param allowedRoles Array di ruoli autorizzati. Se vuoto, richiede solo autenticazione
 * @param handler Il gestore della richiesta effettiva da eseguire se autorizzato
 * @returns Una funzione handler compatibile con Next.js App Router
 *
 * @example
 * // Route accessibile solo agli admin
 * export const POST = withAuth(['admin'], async (req, context) => {
 *   const { accessToken, userId, roles } = context;
 *   return NextResponse.json({ message: 'Admin only data' });
 * });
 *
 * @example
 * // Route accessibile a qualsiasi utente autenticato
 * export const GET = withAuth([], async (req, context) => {
 *   const { session, accessToken } = context;
 *   return NextResponse.json({ message: 'Authenticated user data' });
 * });
 */
export function withAuth<R extends NextRequest | Request, C = unknown>(
  allowedRoles: string[],
  handler: (
    req: R,
    context: AuthContext & C
  ) => Promise<Response | NextResponse>
): (req: R, context?: C) => Promise<Response | NextResponse> {
  return async (req: R, context?: C) => {
    // Verifica autenticazione con NextAuth
    const session: Session | null = await auth();
    const token: JWT | null = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });

    if (!token?.sub || !session) {
      // Per richieste JSON (default)
      if (req.headers.get("Accept")?.includes("application/json")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Per richieste SSE (Server-Sent Events)
      else if (req.headers.get("Accept")?.includes("text/event-stream")) {
        const encoder = new TextEncoder();
        const customEncode = (chunk: object) =>
          encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);
        return new Response(
          customEncode({ type: "error", error: "Unauthorized" }),
          {
            status: 401,
            headers: { "Content-Type": "text/event-stream" },
          }
        );
      }
      // Risposta predefinita
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Recupera token e privilegi da Redis usando il sub
    const tokens = await getUserTokens(token.sub);

    if (!tokens?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Se sono specificati ruoli, verifica che l'utente ne abbia almeno uno
    if (allowedRoles.length > 0) {
      const userRoles = Array.isArray(tokens.roles) ? tokens.roles : [];
      const hasRequiredRole = allowedRoles.some((role) =>
        userRoles.includes(role)
      );

      if (!hasRequiredRole) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message: "You don't have the required role to access this resource",
          },
          { status: 403 }
        );
      }
    }

    // Se autenticazione e autorizzazione sono passate, esegui l'handler
    // Estende il context con accessToken e altre info utili
    const extendedContext = {
      ...(context || {}),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      idToken: tokens.idToken,
      userId: token.sub,
      brand: tokens.brand,
      roles: tokens.roles,
      session,
      token,
    } as AuthContext & C;

    return handler(req, extendedContext);
  };
}
