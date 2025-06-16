import { ROLES } from "@/consts/consts";
import {
  createTranslation,
  deleteTranslationKey,
  getAllTranslations,
} from "@/lib/admin-translations";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { handleApiError } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch all translations
export const GET = withAuth<NextRequest>([ROLES.ADMIN], async (req) => {
  try {
    const translations = await getAllTranslations();
    return NextResponse.json({ translations });
  } catch (error) {
    return handleApiError(error);
  }
});

// POST - Create new translation
export const POST = withAuth<NextRequest>([ROLES.ADMIN], async (req) => {
  try {
    const { key, locale, value, namespace = "common" } = await req.json();

    if (!key || !locale || !value) {
      return NextResponse.json(
        { error: "Key, locale, and value are required" },
        { status: 400 }
      );
    }

    const translation = await createTranslation(key, locale, value, namespace);

    if (!translation) {
      return NextResponse.json(
        { error: "Failed to create translation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ translation });
  } catch (error) {
    return handleApiError(error);
  }
});

// PUT - Update existing translation
export const PUT = withAuth<NextRequest>([ROLES.ADMIN], async (req) => {
  try {
    const { key, locale, value, namespace = "common" } = await req.json();

    if (!key || !locale || value === undefined) {
      return NextResponse.json(
        { error: "Key, locale, and value are required" },
        { status: 400 }
      );
    }

    const translation = await createTranslation(key, locale, value, namespace);

    if (!translation) {
      return NextResponse.json(
        { error: "Failed to update translation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ translation });
  } catch (error) {
    return handleApiError(error);
  }
});

// DELETE - Delete translation key (all locales)
export const DELETE = withAuth<NextRequest>([ROLES.ADMIN], async (req) => {
  try {
    const { key, namespace = "common" } = await req.json();

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const success = await deleteTranslationKey(key, namespace);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete translation key" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});
