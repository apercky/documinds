import {
  createTranslation,
  deleteTranslation,
  getTranslationsByLocale,
} from "@/lib/admin-translations";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get("locale");

  if (!locale) {
    return NextResponse.json(
      { error: "Locale parameter is required" },
      { status: 400 }
    );
  }

  try {
    const translations = await getTranslationsByLocale(locale);
    return NextResponse.json({ translations });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch translations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, locale, value, namespace = "common" } = await request.json();

    if (!key || !locale || !value) {
      return NextResponse.json(
        { error: "Key, locale, and value are required" },
        { status: 400 }
      );
    }

    const translation = await createTranslation(key, locale, value, namespace);

    if (translation) {
      return NextResponse.json({ success: true, translation });
    } else {
      return NextResponse.json(
        { error: "Failed to create translation" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { key, locale, namespace = "common" } = await request.json();

    if (!key || !locale) {
      return NextResponse.json(
        { error: "Key and locale are required" },
        { status: 400 }
      );
    }

    const success = await deleteTranslation(key, locale, namespace);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to delete translation" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
