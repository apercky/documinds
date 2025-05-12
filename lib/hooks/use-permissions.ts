import { hasPermission } from "@/lib/auth/helper";
import type { StructuredPermissions } from "@/types/permission";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface UserWithPermissions {
  permissions: StructuredPermissions;
  accessToken?: string;
  expiresAt?: number;
  roles?: string[];
}

/**
 * Hook per verificare i permessi utente e ottenere l'access token
 * Richiede l'API /api/me per ottenere i dati che non sono nei cookie
 * per evitare il problema CHUNKING_SESSION_COOKIE
 */
export function usePermissions() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userData, setUserData] = useState<UserWithPermissions>({
    permissions: {},
    accessToken: undefined,
    roles: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchUserData() {
      if (status === "loading") return;
      if (!session?.user) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        // Carica i dati estesi dell'utente dal backend
        const response = await fetch("/api/me");
        if (!response.ok) {
          throw new Error(`Errore ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (isMounted) {
          setUserData({
            permissions: data.user.permissions || {},
            accessToken: data.accessToken,
            expiresAt: data.expiresAt,
            roles: data.user.roles || [],
          });
          setError(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Errore nel recupero dei dati utente:", error);
        if (isMounted) {
          setError(error instanceof Error ? error : new Error(String(error)));
          setIsLoading(false);
        }
      }
    }

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [session, status]);

  // Funzione per controllare un permesso specifico
  const checkPermission = (resource: string, action: string): boolean => {
    if (!userData.permissions) return false;
    return hasPermission(userData.permissions, resource, action);
  };

  // Funzione per controllare se l'utente ha un ruolo specifico
  const hasRole = (role: string): boolean => {
    return userData.roles?.includes(role) || false;
  };

  return {
    isLoading,
    error,
    permissions: userData.permissions,
    accessToken: userData.accessToken,
    expiresAt: userData.expiresAt,
    roles: userData.roles,
    checkPermission,
    hasRole,
  };
}
