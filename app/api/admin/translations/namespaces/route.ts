import { ROLES } from "@/consts/consts";
import { getAllNamespaces } from "@/lib/admin-translations";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { handleApiError } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";

export const GET = withAuth<NextRequest>([ROLES.ADMIN], async (req) => {
  try {
    const namespaces = await getAllNamespaces();
    return NextResponse.json({ namespaces });
  } catch (error) {
    return handleApiError(error);
  }
});
