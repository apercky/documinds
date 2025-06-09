import { getAvailableLocales, getTranslations } from "@/lib/translations";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Validate that the incoming locale is valid
  const validLocales = await getAvailableLocales();
  if (typeof locale !== "string" || !validLocales.includes(locale)) {
    locale = routing.defaultLocale;
  }

  const messages = await getTranslations(locale);

  return {
    locale,
    messages,
    timeZone: "Europe/Rome",
  };
});
