"use client";

import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Hook che fornisce utility per la gestione dell'autenticazione
 * e delle cache relate all'utente
 */
export function useAuthUtils() {
  const queryClient = useQueryClient();
  const router = useRouter();

  /**
   * Effettua il logout e pulisce tutte le cache dell'utente
   * @param callbackUrl URL opzionale per il redirect dopo il logout
   */
  const logout = async (callbackUrl?: string) => {
    // Prima invalidiamo tutte le query con userData o quelle protette da auth
    queryClient.invalidateQueries({ queryKey: ["userData"] });

    // Rimuovi completamente i dati dalla cache per evitare dati vecchi
    queryClient.removeQueries({ queryKey: ["userData"] });

    if (callbackUrl) {
      // Con redirect automatico di NextAuth
      await signOut({
        redirect: true,
        callbackUrl,
      });
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
