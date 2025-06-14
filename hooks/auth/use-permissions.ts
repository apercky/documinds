import { hasPermission } from "@/lib/auth/helper";
import type { StructuredPermissions } from "@/types/permission";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 1 * 60 * 1000; // 1 minute

interface UserWithPermissions {
  permissions: StructuredPermissions;
  accessToken?: string;
  expiresAt?: number;
  roles?: string[];
}

// Funzione per recuperare i dati utente dall'API
async function fetchUserData() {
  const response = await fetch("/api/me");

  if (!response.ok) {
    // Creiamo un errore più dettagliato con informazioni sul tipo di errore
    throw new Error(`Errore ${response.status}: ${response.statusText}`, {
      cause: {
        status: response.status,
        statusText: response.statusText,
        isAuthError: response.status === 401,
        response: response,
      },
    });
  }

  return response.json();
}

/**
 * Hook per verificare i permessi utente e ottenere l'access token
 * Utilizza React Query per il caching e l'invalidazione automatica
 */
export function usePermissions() {
  const { data: session, status } = useSession();

  // Utilizziamo React Query per gestire la cache e lo stato di loading/error
  const { data, isLoading, error } = useQuery({
    queryKey: ["userData", session?.user?.id],
    queryFn: fetchUserData,
    // La query viene eseguita solo se l'utente è autenticato
    enabled: !!session?.user,
    // Opzioni specifiche per questa query
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Estrai i dati utente dalla risposta o utilizza valori predefiniti
  const userData: UserWithPermissions = data
    ? {
        permissions: data.user.permissions || {},
        roles: data.user.roles || [],
      }
    : {
        permissions: {},
        roles: [],
      };

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
    isLoading: isLoading || status === "loading",
    error: error as Error | null,
    permissions: userData.permissions,
    roles: userData.roles,
    checkPermission,
    hasRole,
  };
}
