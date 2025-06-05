"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const t = useTranslations("Login");
  const { locale } = useParams();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRedirecting(true);
      signIn("oidc", {
        callbackUrl: `/${locale}/dashboard`,
      });
    }, 1000); // 2.5 seconds delay

    return () => clearTimeout(timer);
  }, [locale]);

  return (
    <main className="flex flex-1 h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background dark:bg-background">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-t-4 border-b-4 border-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-background dark:bg-background"></div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            {t("authenticating")}
          </h1>
          <p className="text-muted-foreground">
            {isRedirecting ? t("redirectingToLogin") : t("preparingConnection")}
          </p>
        </div>

        <div className="flex gap-1.5 mt-2">
          <div
            className="h-2 w-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="h-2 w-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="h-2 w-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
      </div>
    </main>
  );
}
