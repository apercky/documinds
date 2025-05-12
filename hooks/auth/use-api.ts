import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { usePermissions } from "./use-permissions";

interface ApiCallOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  extraHeaders?: Record<string, string>;
  invalidateQueries?: string[]; // Array di query keys da invalidare dopo la chiamata
}

// Tipo per i parametri della chiamata API
interface ApiCallParams extends ApiCallOptions {
  url: string;
}

/**
 * Hook per effettuare chiamate API autenticate
 * Utilizza l'access token recuperato dall'endpoint /api/me e React Query per le mutazioni
 */
export function useApi() {
  const { accessToken, isLoading: isTokenLoading } = usePermissions();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  /**
   * Funzione interna per eseguire la chiamata API
   */
  const executeApiCall = async <T = any>({
    url,
    method = "GET",
    body,
    extraHeaders = {},
    invalidateQueries = [],
  }: ApiCallParams): Promise<T> => {
    if (!accessToken) {
      throw new Error("Nessun token di accesso disponibile");
    }

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
      throw new Error(`Errore API: ${response.status} ${response.statusText}`);
    }

    // Invalida le query specificate per aggiornare i dati in cache
    if (invalidateQueries.length > 0) {
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
    }

    // Parse JSON result
    return await response.json();
  };

  // Utilizza useMutation per gestire lo stato delle chiamate API
  const mutation = useMutation<any, Error, ApiCallParams>({
    mutationFn: executeApiCall,
    onError: (err: Error) => {
      setError(err);
      console.error("Errore chiamata API:", err);
    },
  });

  /**
   * Esegue una chiamata API autenticata
   */
  const callApi = <T = any>(
    url: string,
    options: ApiCallOptions = {}
  ): Promise<T> => {
    // Se il token è ancora in caricamento, attendi
    if (isTokenLoading) {
      return Promise.reject(new Error("Token non ancora disponibile"));
    }

    setError(null);
    return mutation.mutateAsync({ url, ...options }) as Promise<T>;
  };

  return {
    callApi,
    isLoading: mutation.isPending,
    error,
  };
}
