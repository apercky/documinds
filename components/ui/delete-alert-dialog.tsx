"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface DeleteAlertDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  name: string;
  confirmationWord?: string;
}

export function DeleteAlertDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  name,
  confirmationWord = "DELETE",
}: DeleteAlertDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const t = useTranslations("deleteAlert");

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    setConfirmText("");
  };

  const handleConfirm = () => {
    if (confirmText === confirmationWord) {
      onConfirm();
      handleOpenChange(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <div className="space-y-4">
            <AlertDialogDescription>
              {t("description", { name })}
            </AlertDialogDescription>
            <div className="text-sm text-muted-foreground">
              {t("confirmText", { action: confirmationWord })}
            </div>
            <Input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t("confirmPlaceholder", {
                action: confirmationWord,
              })}
            />
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancelButton")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 hover:bg-red-600 disabled:bg-red-300"
            onClick={handleConfirm}
            disabled={confirmText !== confirmationWord}
          >
            {t("deleteButton")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
