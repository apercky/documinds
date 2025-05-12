import { auth } from "@/lib/auth/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint per ottenere i dati completi dell'utente, inclusi i permessi
 * che non sono inclusi nel cookie di sessione per motivi di dimensione
 */
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Utente non autenticato" },
      { status: 401 }
    );
  }

  // Ottieni il token completo - questo non è esposto nel cookie
  // ma è disponibile nel backend tramite auth()
  const token = (session as any).token || {};

  // Crea una versione completa dei dati utente
  const userData = {
    ...session.user,
    permissions: token.permissions || {},
    roles: token.roles || [],
  };

  return NextResponse.json({
    user: userData,
  });
}
