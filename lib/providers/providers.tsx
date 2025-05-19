"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Provider globale per React Query
 * Consente di utilizzare la cache delle query in tutta l'applicazione
 */
export function Providers({ children }: ProvidersProps) {
  // Creiamo una nuova istanza del client per ogni sessione
  // Questo evita problemi di condivisione di stato tra utenti in SSR
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Impostazioni predefinite per tutte le query
            staleTime: 5 * 60 * 1000, // 5 minuti prima che i dati siano considerati "stale"
            gcTime: 30 * 60 * 1000, // 30 minuti prima che la cache venga eliminata (era cacheTime nelle versioni precedenti)
            retry: 1, // Riprova una volta in caso di errore
            refetchOnWindowFocus: false, // Non richiede in automatico quando la finestra torna in focus
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
