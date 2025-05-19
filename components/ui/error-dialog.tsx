"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale } from "next-intl";
import { useState } from "react";

interface ErrorDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title?: string;
  message?: string;
  details?: string | null;
}

// Inline translations to avoid dependency on message files
const translations = {
  en: {
    defaultTitle: "Error Occurred",
    defaultMessage:
      "An unexpected error occurred while processing your request.",
    technicalDetails: "Technical Details",
    showDetails: "Show Details",
    hideDetails: "Hide Details",
    okButton: "OK",
  },
  it: {
    defaultTitle: "Errore",
    defaultMessage:
      "Si è verificato un errore imprevisto durante l'elaborazione della richiesta.",
    technicalDetails: "Dettagli Tecnici",
    showDetails: "Mostra Dettagli",
    hideDetails: "Nascondi Dettagli",
    okButton: "OK",
  },
};

export function ErrorDialog({
  isOpen,
  onOpenChange,
  title,
  message,
  details = null,
}: ErrorDialogProps) {
  const locale = useLocale() as keyof typeof translations;
  const t = translations[locale] || translations.en;
  const [showDetails, setShowDetails] = useState(false);

  const handleOkClick = () => {
    onOpenChange(false);
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title || t.defaultTitle}</DialogTitle>
          <DialogDescription>{message || t.defaultMessage}</DialogDescription>
        </DialogHeader>

        {details && (
          <div className="border rounded-md p-3 bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t.technicalDetails}</span>
              <Button variant="ghost" size="sm" onClick={toggleDetails}>
                {showDetails ? t.hideDetails : t.showDetails}
              </Button>
            </div>

            {showDetails && (
              <pre className="mt-2 text-xs whitespace-pre-wrap break-all bg-muted/50 p-2 rounded max-h-[200px] overflow-auto">
                {details}
              </pre>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleOkClick}>{t.okButton}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
