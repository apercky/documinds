import "server-only";

import { auth } from "@/lib/auth/auth";
import { getToken } from "next-auth/jwt";
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
 * Interceptor per proteggere le route con autenticazione e controllo ruoli
 *
 * @param allowedRoles Array di ruoli autorizzati. Se vuoto, richiede solo autenticazione
 * @param handler Il gestore della richiesta effettiva da eseguire se autorizzato
 * @returns Una funzione handler compatibile con Next.js App Router
 *
 * @example
 * // Route accessibile solo agli admin
 * export const POST = withAuth(['admin'], async (req) => {
 *   return NextResponse.json({ message: 'Admin only data' });
 * });
 *
 * @example
 * // Route accessibile a qualsiasi utente autenticato
 * export const GET = withAuth([], async (req) => {
 *   return NextResponse.json({ message: 'Authenticated user data' });
 * });
 */
export function withAuth<R extends NextRequest | Request, C = unknown>(
  allowedRoles: string[],
  handler: (req: R, context?: C) => Promise<Response | NextResponse>
): (req: R, context?: C) => Promise<Response | NextResponse> {
  return async (req: R, context?: C) => {
    // Verifica autenticazione con NextAuth
    const session = await auth();
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });

    if (!token?.accessToken || !session) {
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

    // Se sono specificati ruoli, verifica che l'utente ne abbia almeno uno
    if (allowedRoles.length > 0) {
      const userRoles = Array.isArray(token.roles) ? token.roles : [];
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
    return handler(req, context);
  };
}
