import { useState } from "react";
import { usePermissions } from "./use-permissions";

interface ApiCallOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  extraHeaders?: Record<string, string>;
}

/**
 * Hook per effettuare chiamate API autenticate
 * Utilizza l'access token recuperato dall'endpoint /api/me
 */
export function useApi() {
  const { accessToken, isLoading: isTokenLoading } = usePermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Esegue una chiamata API autenticata usando l'access token
   */
  async function callApi<T = any>(
    url: string,
    options: ApiCallOptions = {}
  ): Promise<T> {
    // Se il token è ancora in caricamento, attendi
    if (isTokenLoading) {
      throw new Error("Token non ancora disponibile");
    }

    // Se non c'è un token, la chiamata API fallirà
    if (!accessToken) {
      throw new Error("Nessun token di accesso disponibile");
    }

    const { method = "GET", body, extraHeaders = {} } = options;

    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        ...extraHeaders,
        Authorization: `Bearer ${accessToken}`,
      };

      // Aggiungi Content-Type solo se c'è un body
      if (body && typeof body === "object") {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(
          `Errore API: ${response.status} ${response.statusText}`
        );
      }

      // Parse JSON result
      const data = await response.json();
      return data as T;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    callApi,
    isLoading,
    error,
  };
}
