import { auth, getUserPermissions } from "@/lib/auth/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint per ottenere i dati completi dell'utente, inclusi i permessi e token
 * che non sono inclusi nel cookie di sessione per evitare CHUNKING_SESSION_COOKIE
 */
export async function GET(req: NextRequest) {
  // Ottieni la sessione utente (contiene solo dati leggeri)
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Utente non autenticato" },
      { status: 401 }
    );
  }

  try {
    // Ottieni il token completo - questo è disponibile nel backend tramite auth()
    const token = (session as any).token || {};
    const accessToken = token.accessToken;

    // Recupera i permessi direttamente da Keycloak utilizzando l'access token
    const permissions = await getUserPermissions(accessToken);

    // Crea una versione completa dei dati utente
    const userData = {
      ...session.user,
      // Brand è già nell'oggetto user
      permissions,
      roles: token.roles || [],
    };

    return NextResponse.json({
      user: userData,
      accessToken: accessToken,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    console.error("Errore nel recupero dei dati utente:", error);
    return NextResponse.json(
      { error: "Errore nel recupero dei dati utente" },
      { status: 500 }
    );
  }
}
