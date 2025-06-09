import type { Translation } from "@prisma/client";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export interface Messages {
  [key: string]: string | Messages;
}

// Cache tag for translation data
const TRANSLATIONS_CACHE_TAG = "translations";

// Function to fetch translations from database using Prisma
async function fetchTranslationsFromDB(locale: string): Promise<Translation[]> {
  try {
    const translations = await prisma.translation.findMany({
      where: {
        locale: locale,
      },
      orderBy: [{ namespace: "asc" }, { key: "asc" }],
    });
    return translations;
  } catch (error) {
    console.error("Error fetching translations from database:", error);
    throw new Error("Failed to fetch translations");
  }
}

// Transform flat translations to nested object structure
function transformTranslations(translations: Translation[]): Messages {
  const messages: Messages = {};

  translations.forEach(({ key, value, namespace }) => {
    // Combine namespace and key
    const fullKey = namespace === "common" ? key : `${namespace}.${key}`;

    // Split by dots to create nested structure
    const keys = fullKey.split(".");
    let current = messages;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Messages;
    }

    current[keys[keys.length - 1]] = value;
  });

  return messages;
}

// Cached function to get translations (cached for 24 hours)
export const getTranslations = unstable_cache(
  async (locale: string): Promise<Messages> => {
    console.log(`Loading translations from database for locale: ${locale}`);
    const translations = await fetchTranslationsFromDB(locale);
    return transformTranslations(translations);
  },
  ["translations"],
  {
    tags: [TRANSLATIONS_CACHE_TAG],
    revalidate: 86400, // 24 hours in seconds
  }
);

// Function to invalidate translation cache
export async function invalidateTranslationsCache(): Promise<void> {
  revalidateTag(TRANSLATIONS_CACHE_TAG);
}

// Function to get all available locales
export const getAvailableLocales = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const locales = await prisma.translation.findMany({
        select: { locale: true },
        distinct: ["locale"],
        orderBy: { locale: "asc" },
      });
      return locales.map((item) => item.locale);
    } catch (error) {
      console.error("Error fetching available locales:", error);
      return ["en"]; // Fallback to English
    }
  },
  ["available-locales"],
  {
    tags: [TRANSLATIONS_CACHE_TAG],
    revalidate: 86400,
  }
);
