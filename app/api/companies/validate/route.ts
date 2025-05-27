import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { validateBrandAccess } from "@/lib/services/company.service";
import { handleApiError } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";

/**
 * Validate current user's brand access
 */
export const GET = withAuth<NextRequest>([ROLES.USER], async (req, context) => {
  try {
    // Get brand from session (this would come from your auth system)
    // For now, we'll get it from query params or headers
    const brandCode =
      req.nextUrl.searchParams.get("brand") || req.headers.get("x-brand-code");

    if (!brandCode) {
      return NextResponse.json(
        {
          error: "BRAND_CODE_MISSING",
          message: "Brand code is required",
        },
        { status: 400 }
      );
    }

    const company = await validateBrandAccess(brandCode);

    if (!company) {
      return NextResponse.json(
        {
          error: "BRAND_NOT_SUPPORTED",
          message: "Brand not supported or inactive",
          brandCode,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      company: {
        id: company.id,
        code: company.code,
        name: company.name,
        description: company.description,
        brandCode: company.brandCode,
        settingsCount: company.settings?.length || 0,
      },
      isValid: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
