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

    // Otteniamo il percorso senza il locale corrente
    // 1. Dividiamo il pathname in segmenti
    const segments = pathname.split("/").filter(Boolean);

    // 2. Se il primo segmento è un locale, lo rimuoviamo
    if (segments.length > 0 && locales.includes(segments[0])) {
      segments.shift();
    }

    // 3. Ricostruiamo il percorso
    const newPathname = segments.length > 0 ? `/${segments.join("/")}` : "/";

    // Navighiamo al nuovo URL con il locale desiderato
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
            className={`cursor-pointer ${
              locale === currentLocale ? "font-bold" : ""
            }`}
          >
            {t(locale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
