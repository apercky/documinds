import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function Footer() {
  const t = useTranslations("Footer");
  const privacyT = useTranslations("PrivacyPolicy");
  const cookieT = useTranslations("CookiePolicy");
  const currentYear = new Date().getFullYear();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);

  return (
    <>
      <footer className="z-50 w-full border-t border-border/60 bg-background/40 dark:bg-background/40 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company info */}
            <div className="flex flex-col space-y-2">
              <h3 className="text-sm font-semibold text-primary">
                ALGOSET SRL
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("companyDescription")}
              </p>
              <div className="text-xs text-muted-foreground">
                <span className="block">{t("companyAddress")}</span>
                <span className="block">{t("companyVatRea")}</span>
              </div>
            </div>

            {/* Legal section */}
            <div className="flex flex-col space-y-2">
              <h3 className="text-sm font-semibold text-primary">
                {t("legals")}
              </h3>
              <div className="flex flex-col space-y-1">
                <Button
                  onClick={() => setPrivacyOpen(true)}
                  variant="link"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors justify-start p-0 h-6"
                >
                  {t("privacyPolicy")}
                </Button>
                <Button
                  onClick={() => setCookieOpen(true)}
                  variant="link"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors justify-start p-0 h-6"
                >
                  {t("cookiePolicy")}
                </Button>
              </div>
            </div>
          </div>

          {/* Copyright - molto più compatto */}
          <div className="mt-3 pt-2 border-t border-border/20">
            <p className="text-xs text-muted-foreground/70 text-center">
              © {currentYear} ALGOSET SRL — {t("allRightsReserved")}
            </p>
          </div>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{privacyT("title")}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {privacyT("lastUpdated")}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4 text-sm">
            <p>{privacyT("introduction")}</p>

            {Object.entries(privacyT.raw("sections")).map(
              ([key, section]: [string, any]) => (
                <div key={key} className="mt-4">
                  <h3 className="font-medium">{section.title}</h3>
                  <p className="whitespace-pre-line mt-1">{section.content}</p>
                </div>
              )
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setPrivacyOpen(false)}>
              {t("closePrivacyPolicy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cookie Policy Modal */}
      <Dialog open={cookieOpen} onOpenChange={setCookieOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{cookieT("title")}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {cookieT("lastUpdated")}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4 text-sm">
            <p>{cookieT("introduction")}</p>

            {Object.entries(cookieT.raw("sections")).map(
              ([key, section]: [string, any]) => (
                <div key={key} className="mt-4">
                  <h3 className="font-medium">{section.title}</h3>
                  <p className="whitespace-pre-line mt-1">{section.content}</p>
                </div>
              )
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setCookieOpen(false)}>
              {t("closeCookiePolicy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
