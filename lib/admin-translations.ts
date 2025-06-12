import type { Translation } from "@prisma/client";
import { prisma } from "./prisma";
import { invalidateTranslationsCache } from "./translations";

export async function createTranslation(
  key: string,
  locale: string,
  value: string,
  namespace: string = "common"
): Promise<Translation | null> {
  try {
    const translation = await prisma.translation.upsert({
      where: {
        key_locale_namespace: { key, locale, namespace },
      },
      update: {
        value,
        updatedAt: new Date(),
      },
      create: {
        key,
        locale,
        value,
        namespace,
      },
    });

    await invalidateTranslationsCache();
    return translation;
  } catch (error) {
    console.error("Error creating/updating translation:", error);
    return null;
  }
}

export async function deleteTranslation(
  key: string,
  locale: string,
  namespace: string = "common"
): Promise<boolean> {
  try {
    await prisma.translation.delete({
      where: {
        key_locale_namespace: { key, locale, namespace },
      },
    });

    await invalidateTranslationsCache();
    return true;
  } catch (error) {
    console.error("Error deleting translation:", error);
    return false;
  }
}

export async function getTranslationsByLocale(
  locale: string
): Promise<Translation[]> {
  try {
    return await prisma.translation.findMany({
      where: { locale },
      orderBy: [{ namespace: "asc" }, { key: "asc" }],
    });
  } catch (error) {
    console.error("Error fetching translations by locale:", error);
    return [];
  }
}

export async function getTranslationsByNamespace(
  locale: string,
  namespace: string
): Promise<Translation[]> {
  try {
    return await prisma.translation.findMany({
      where: {
        locale,
        namespace,
      },
      orderBy: { key: "asc" },
    });
  } catch (error) {
    console.error("Error fetching translations by namespace:", error);
    return [];
  }
}

export async function getAllNamespaces(): Promise<string[]> {
  try {
    const namespaces = await prisma.translation.findMany({
      select: { namespace: true },
      distinct: ["namespace"],
      orderBy: { namespace: "asc" },
    });
    return namespaces.map((item) => item.namespace);
  } catch (error) {
    console.error("Error fetching namespaces:", error);
    return ["common"];
  }
}
