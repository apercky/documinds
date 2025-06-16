import { ROLES } from "@/consts/consts";
import { getTranslationsForExport } from "@/lib/admin-translations";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { handleApiError } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";

export const GET = withAuth<NextRequest>([ROLES.ADMIN], async (req) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const namespace = searchParams.get("namespace");

    const translations = await getTranslationsForExport(namespace || undefined);

    // Group translations by namespace and key for easier import
    const grouped: Record<string, Record<string, Record<string, string>>> = {};

    translations.forEach((translation) => {
      if (!grouped[translation.namespace]) {
        grouped[translation.namespace] = {};
      }
      if (!grouped[translation.namespace][translation.key]) {
        grouped[translation.namespace][translation.key] = {};
      }
      grouped[translation.namespace][translation.key][translation.locale] =
        translation.value;
    });

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      namespace: namespace || "all",
      translations: grouped,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
