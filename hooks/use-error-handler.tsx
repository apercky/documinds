"use client";

import { ErrorDialog } from "@/components/ui/error-dialog";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

/**
 * Hook per la gestione centralizzata degli errori nell'applicazione
 */
export function useErrorHandler() {
  const t = useTranslations("Errors");
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);

  /**
   * Gestisce un errore e mostra il dialog di errore
   * Memorizzata con useCallback per evitare ricreazioni e possibili loop
   */
  const handleError = useCallback(
    (err: any) => {
      let errorMessage = t("genericError");
      let details = null;

      // Se è un errore standard
      if (err instanceof Error) {
        errorMessage = err.message;

        // Estrai dettagli tecnici dalla causa dell'errore
        if (err.cause && typeof err.cause === "object") {
          try {
            const cause = err.cause as any;
            // Controlla se c'è una risposta API
            if (cause.response) {
              details = JSON.stringify(cause.response, null, 2);
            } else if (cause.status) {
              details = JSON.stringify(
                {
                  status: cause.status,
                  statusText: cause.statusText,
                  data: cause.data,
                },
                null,
                2
              );
            } else {
              details = JSON.stringify(cause, null, 2);
            }
          } catch (e) {
            console.error(
              "Errore durante la conversione della causa dell'errore:",
              e
            );
            details = String(err.cause);
          }
        }
      } else if (typeof err === "string") {
        // Se è una stringa
        errorMessage = err;
      } else if (err && typeof err === "object") {
        // Se è un oggetto
        try {
          details = JSON.stringify(err, null, 2);
          if (err.message) errorMessage = err.message;
        } catch (e) {
          errorMessage = t("unknownError");
        }
      }

      // Imposta gli stati per mostrare il dialog
      setError(errorMessage);
      setErrorDetails(details);
      setIsErrorDialogOpen(true);

      // Log dell'errore alla console per debug
      console.error("Error:", errorMessage, err);
    },
    [t]
  ); // Dipendenza da t per le traduzioni

  /**
   * Funzione per pulire lo stato degli errori
   * Memorizzata con useCallback per consistenza
   */
  const clearError = useCallback(() => {
    setError(null);
    setErrorDetails(null);
    setIsErrorDialogOpen(false);
  }, []);

  /**
   * Componente dialog per mostrare l'errore
   */
  const ErrorDialogComponent = useCallback(
    () => (
      <ErrorDialog
        isOpen={isErrorDialogOpen}
        onOpenChange={setIsErrorDialogOpen}
        title={t("applicationErrorTitle")}
        message={error || t("unexpectedError")}
        details={errorDetails}
      />
    ),
    [isErrorDialogOpen, error, errorDetails, t]
  );

  return {
    error,
    handleError,
    clearError,
    ErrorDialogComponent,
  };
}
