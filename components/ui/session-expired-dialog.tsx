"use client";

import { useRouter } from "@/app/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLogoutStore } from "@/store/logout";
import { useTranslations } from "next-intl";

interface SessionExpiredDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SessionExpiredDialog({
  isOpen,
  onOpenChange,
}: SessionExpiredDialogProps) {
  const router = useRouter();
  const t = useTranslations("Auth");
  const { isLoggedOut } = useLogoutStore();

  const handleOkClick = () => {
    onOpenChange(false);
    window.location.replace("/");
    //router.refresh();
  };

  // Don't show the dialog if a logout operation is already in progress
  const shouldShowDialog = isOpen && !isLoggedOut;

  return (
    <Dialog open={shouldShowDialog} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("sessionExpired.title", { defaultValue: "Session Expired" })}
          </DialogTitle>
          <DialogDescription>
            {t("sessionExpired.description", {
              defaultValue:
                "Your session has expired. Please login again to continue.",
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleOkClick}>
            {t("sessionExpired.okButton", { defaultValue: "OK" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
