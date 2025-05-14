"use client";

import { useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Hook che fornisce utility per la gestione dell'autenticazione
 * e delle cache relate all'utente
 */
export function useAuthUtils() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();

  /**
   * Effettua il logout e pulisce tutte le cache dell'utente
   * @param redirectTo URL opzionale per il redirect dopo il logout
   */
  const logout = async () => {
    const idToken = (session as any).token?.idToken;
    console.log("idToken", idToken);
    const logoutEndpoint = `${process.env.NEXT_PUBLIC_OIDC_ISSUER}/protocol/openid-connect/logout`;
    const logoutUrl = `${logoutEndpoint}?id_token_hint=${idToken}&post_logout_redirect_uri=${process.env.NEXT_PUBLIC_NEXTAUTH_URL}`;

    console.log("logoutUrl", logoutUrl);
    // Prima invalidiamo tutte le query con userData o quelle protette da auth
    queryClient.invalidateQueries({ queryKey: ["userData"] });

    // Rimuovi completamente i dati dalla cache per evitare dati vecchi
    queryClient.removeQueries({ queryKey: ["userData"] });

    if (logoutUrl) {
      // Con redirect automatico di NextAuth
      await signOut({
        redirect: false,
      });
      window.location.href = logoutUrl;
    } else {
      // Senza redirect automatico, lo gestiamo manualmente
      await signOut({ redirect: false });

      // Reindirizza alla home page o alla pagina di login
      router.push("/");

      // Forza un refresh della pagina per pulire completamente lo stato
      router.refresh();
    }
  };

  /**
   * Ricarica i dati dell'utente, forza un refresh dalla rete
   */
  const refreshUserData = () => {
    queryClient.invalidateQueries({ queryKey: ["userData"] });
  };

  return {
    logout,
    refreshUserData,
  };
}
