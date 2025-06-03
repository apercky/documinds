import { useErrorHandler } from "@/hooks/use-error-handler";
import { hasPermission } from "@/lib/auth/helper";
import { debugLog, debugStderr } from "@/lib/utils/debug-logger";
import type { StructuredPermissions } from "@/types/permission";
import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

// Ridotti per gestire meglio i refresh ogni 5 minuti di Keycloak
const STALE_TIME = 1 * 60 * 1000; // 1 minuto
const GC_TIME = 3 * 60 * 1000; // 3 minuti

interface UserWithPermissions {
  permissions: StructuredPermissions;
  accessToken?: string;
  expiresAt?: number;
  roles?: string[];
}

// Funzione per recuperare i dati utente dall'API
async function fetchUserData() {
  debugLog("🔍 [usePermissions] fetchUserData called");

  const response = await fetch("/api/me");

  debugLog(
    "📥 [usePermissions] API response:",
    response.status,
    response.statusText
  );

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
  const { data: session, status, update } = useSession();
  const { handleError } = useErrorHandler();

  debugLog(
    "🔄 [usePermissions] Hook called - session status:",
    status,
    "user:",
    !!session?.user
  );

  // Utilizziamo React Query per gestire la cache e lo stato di loading/error
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["userData", session?.user?.id],
    queryFn: fetchUserData,
    // La query viene eseguita solo se l'utente è autenticato
    enabled: !!session?.user && status === "authenticated",
    // Opzioni specifiche per questa query
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    // IMPORTANTE: Ferma il loop infinito su 401
    retry: (failureCount, error) => {
      const err = error as any;
      debugLog(
        `🔄 [usePermissions] Retry attempt ${failureCount}, error status:`,
        err?.cause?.status
      );

      // NON fare retry per errori 401 (Unauthorized)
      if (err?.cause?.status === 401) {
        debugLog("❌ [usePermissions] 401 error - no retry");
        return false;
      }
      // Retry fino a 2 volte per altri errori
      return failureCount < 2;
    },
    // Retry delay incrementale
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Gestione degli errori con logout automatico per 401
  useEffect(() => {
    if (error) {
      const err = error as any;
      debugLog(
        "❌ [usePermissions] Error detected:",
        err?.cause?.status,
        err.message
      );

      if (err?.cause?.status === 401) {
        debugLog("🚪 [usePermissions] 401 error - forcing logout");
        // Per errori 401, forza il logout invece di mostrare la dialog
        signOut({ callbackUrl: "/" });
        return;
      }

      // Per altri errori, usa l'error handler normale
      debugStderr("❓ [usePermissions] Non-401 error:", error);
      handleError(error);
    }
  }, [error, handleError]);

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

  debugLog("📊 [usePermissions] Returning:", {
    isLoading,
    hasError: !!error,
    hasPermissions:
      !!userData.permissions && Object.keys(userData.permissions).length > 0,
    hasRoles: !!userData.roles && userData.roles.length > 0,
  });

  return {
    isLoading: isLoading || status === "loading",
    error: error as Error | null,
    permissions: userData.permissions,
    roles: userData.roles,
    checkPermission,
    hasRole,
    refetch,
  };
}
