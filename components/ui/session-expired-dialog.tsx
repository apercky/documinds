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

  const handleOkClick = () => {
    onOpenChange(false);
    window.location.replace("/");
    //router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
