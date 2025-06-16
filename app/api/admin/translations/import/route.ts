import { ROLES } from "@/consts/consts";
import { createTranslation } from "@/lib/admin-translations";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { invalidateTranslationsCache } from "@/lib/translations";
import { handleApiError } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";

export const POST = withAuth<NextRequest>([ROLES.ADMIN], async (req) => {
  try {
    const { data } = await req.json();

    if (!data || !data.translations) {
      return NextResponse.json(
        { error: "Invalid import data format" },
        { status: 400 }
      );
    }

    let importCount = 0;
    const errors: string[] = [];

    // Process the grouped translations
    for (const [namespace, keys] of Object.entries(data.translations)) {
      for (const [key, locales] of Object.entries(
        keys as Record<string, Record<string, string>>
      )) {
        for (const [locale, value] of Object.entries(locales)) {
          try {
            await createTranslation(key, locale, value, namespace);
            importCount++;
          } catch (error) {
            errors.push(
              `Failed to import ${namespace}.${key}.${locale}: ${error}`
            );
          }
        }
      }
    }

    // Invalidate cache after import
    await invalidateTranslationsCache();

    return NextResponse.json({
      success: true,
      imported: importCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
