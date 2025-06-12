import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Validate that the incoming locale is valid
  const validLocales = routing.locales;
  if (typeof locale !== "string" || !validLocales.includes(locale)) {
    locale = routing.defaultLocale;
  }

  // Fetch messages from API route (avoids direct PrismaClient import in middleware)
  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }/api/messages/locale/${locale}`
  );
  const data = await response.json();
  const messages = data.messages;

  return {
    locale,
    messages,
    timeZone: "Europe/Rome",
  };
});
