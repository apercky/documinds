"use client";

import { publicConfig } from "@/config/public-vars";
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
    // Create logout url to logout from the OIDC provider
    const idToken = (session as any).token?.idToken;
    const logoutEndpoint = `${publicConfig.OIDC_ISSUER}/protocol/openid-connect/logout`;
    const logoutUrl = `${logoutEndpoint}?id_token_hint=${idToken}&post_logout_redirect_uri=${publicConfig.NEXTAUTH_URL}`;

    // Prima invalidiamo tutte le query con userData o quelle protette da auth
    queryClient.invalidateQueries({ queryKey: ["userData"] });

    // Rimuovi completamente i dati dalla cache per evitare dati vecchi
    queryClient.removeQueries({ queryKey: ["userData"] });

    console.log(`[NextAuth logoutUrl]: ${logoutUrl}\n`);

    if (idToken) {
      // Con redirect automatico di NextAuth
      await signOut({
        redirect: false,
      });

      // Redirect to the logout url
      window.location.replace(logoutUrl);
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
