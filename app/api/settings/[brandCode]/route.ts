import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { SettingKey } from "@/lib/prisma/generated";
import { validateBrandAccess } from "@/lib/services/company.service";
import {
  getSettingsForUI,
  upsertSetting,
} from "@/lib/services/settings.service";
import { handleApiError } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";

/**
 * Get settings for a specific brand
 */
export const GET = withAuth<
  NextRequest,
  { params: Promise<{ brandCode: string }> }
>([ROLES.USER], async (req, context) => {
  try {
    if (!context || !context.params) {
      return NextResponse.json(
        { error: "Missing route parameters" },
        { status: 400 }
      );
    }

    const { brandCode } = await context.params;

    // Validate brand access
    const company = await validateBrandAccess(brandCode);
    if (!company) {
      return NextResponse.json(
        {
          error: "BRAND_NOT_SUPPORTED",
          message: "Brand not supported or inactive",
        },
        { status: 404 }
      );
    }

    // Get settings for UI (masked values)
    const settings = await getSettingsForUI(brandCode);

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        description: company.description,
        brandCode: company.brandCode,
      },
      settings,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

/**
 * Update settings for a specific brand
 */
export const PUT = withAuth<
  NextRequest,
  { params: Promise<{ brandCode: string }> }
>([ROLES.EDITOR, ROLES.ADMIN], async (req, context) => {
  try {
    if (!context || !context.params) {
      return NextResponse.json(
        { error: "Missing route parameters" },
        { status: 400 }
      );
    }

    const { brandCode } = await context.params;
    const body = await req.json();
    const { settingKey, value } = body;

    // Validate inputs
    if (!settingKey || !value) {
      return NextResponse.json(
        { error: "Setting key and value are required" },
        { status: 400 }
      );
    }

    // Validate setting key
    if (!Object.values(SettingKey).includes(settingKey)) {
      return NextResponse.json(
        { error: "Invalid setting key" },
        { status: 400 }
      );
    }

    // Validate brand access
    const company = await validateBrandAccess(brandCode);
    if (!company) {
      return NextResponse.json(
        {
          error: "BRAND_NOT_SUPPORTED",
          message: "Brand not supported or inactive",
        },
        { status: 404 }
      );
    }

    // TODO: Get user ID from session
    const userId = "system"; // Replace with actual user ID from session

    // Upsert the setting
    const setting = await upsertSetting(brandCode, settingKey, value, userId);

    return NextResponse.json({
      message: "Setting updated successfully",
      settingKey: setting.settingKey,
      isEncrypted: setting.isEncrypted,
      updatedAt: setting.updatedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
