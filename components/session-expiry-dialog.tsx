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
import { useAuthUtils } from "@/hooks/auth/use-auth-utils";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

interface SessionExpiryDialogProps {
  open: boolean;
}

export function SessionExpiryDialog({ open }: SessionExpiryDialogProps) {
  const { logout } = useAuthUtils();
  const t = useTranslations("Auth.sessionExpired");

  const handleBackToLogin = async () => {
    await logout();
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
            <LogOut className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={handleBackToLogin}
            className="w-full sm:w-auto"
            size="lg"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("backToLogin")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
