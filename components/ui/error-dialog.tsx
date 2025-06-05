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
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ErrorDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title?: string;
  message?: string;
  details?: string | null;
}

export function ErrorDialog({
  isOpen,
  onOpenChange,
  title,
  message,
  details = null,
}: ErrorDialogProps) {
  const t = useTranslations("Errors");
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
          <DialogTitle>{title || t("defaultTitle")}</DialogTitle>
          <DialogDescription>
            {message || t("defaultMessage")}
          </DialogDescription>
        </DialogHeader>

        {details && (
          <div className="border rounded-md p-3 bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {t("technicalDetails")}
              </span>
              <Button variant="ghost" size="sm" onClick={toggleDetails}>
                {showDetails ? t("hideDetails") : t("showDetails")}
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
          <Button onClick={handleOkClick}>{t("okButton")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
