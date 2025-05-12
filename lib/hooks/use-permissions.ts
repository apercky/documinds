import { hasPermission } from "@/lib/auth/helper";
import type { StructuredPermissions } from "@/types/permission";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/**
 * Hook per verificare i permessi utente e gestirne lo stato di caricamento
 * Richiede l'API /api/me per ottenere i permessi che non sono nel cookie
 */
export function usePermissions() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<StructuredPermissions>({});

  useEffect(() => {
    async function fetchPermissions() {
      if (status === "loading") return;
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      try {
        // Carica i permessi dal backend
        const response = await fetch("/api/me");
        if (!response.ok)
          throw new Error("Errore nel caricamento dei permessi");

        const data = await response.json();
        setPermissions(data.user.permissions || {});
      } catch (error) {
        console.error("Errore nel recupero dei permessi:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPermissions();
  }, [session, status]);

  // Funzione per controllare un permesso specifico
  const checkPermission = (resource: string, action: string): boolean => {
    return hasPermission(permissions, resource, action);
  };

  return {
    isLoading,
    permissions,
    checkPermission,
  };
}
