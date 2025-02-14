"use client";

import { usePathname, useRouter } from "@/app/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locales } from "@/config/locales";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const t = useTranslations("Languages");

  const handleLanguageChange = (locale: string) => {
    if (locale === currentLocale) return;

    // Remove the locale from the pathname if it exists
    const pathnameWithoutLocale = pathname.replace(`/${currentLocale}`, "");
    const newPathname = pathnameWithoutLocale || "/";

    router.replace(newPathname, { locale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer pr-4"
        >
          <Languages className="h-4 w-4" />
          <span className="sr-only">{t("switchLanguage")}</span>
          <span className="absolute top-0 right-2 text-[10px] font-bold">
            {currentLocale.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLanguageChange(locale)}
            className="cursor-pointer"
          >
            {t(locale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
