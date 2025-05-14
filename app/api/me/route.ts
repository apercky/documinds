import { auth, getUserPermissions } from "@/lib/auth/auth";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint per ottenere i dati completi dell'utente, inclusi i permessi e token
 * che non sono inclusi nel cookie di sessione per evitare CHUNKING_SESSION_COOKIE
 */
export async function GET(req: NextRequest, res: NextResponse) {
  // Ottieni la sessione utente (contiene solo dati leggeri)
  const session = await auth();
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  if (!token?.accessToken || !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ottieni il token completo - questo è disponibile nel backend tramite auth()
    // const token = (session as any).token || {};
    // const token = (session as any).token || {};

    // Debug - logga solo in ambiente di sviluppo
    if (process.env.NODE_ENV === "development") {
      console.log(
        "DEBUG - Session content:",
        JSON.stringify(
          {
            userId: (session as any).userId,
            user: session?.user,
            hasToken: !!token,
            tokenKeys: Object.keys(token),
          },
          null,
          2
        )
      );
    }

    const accessToken = token.accessToken as string;

    // Recupera i permessi direttamente da Keycloak utilizzando l'access token
    const permissions = await getUserPermissions(accessToken);

    // Debug - logga solo in ambiente di sviluppo
    if (process.env.NODE_ENV === "development") {
      console.log(
        "DEBUG - Permissions retrieved:",
        JSON.stringify(permissions, null, 2)
      );
      console.log(
        "DEBUG - Roles from token:",
        JSON.stringify(token.roles, null, 2)
      );
    }

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
