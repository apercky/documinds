import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { Collection } from "@/lib/prisma/generated";
import { getCollections } from "@/lib/services/collection.service";
import { handleApiError } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";

/**
 * Get all collections without brand filtering (admin only)
 */
export const GET = withAuth<NextRequest>([ROLES.ADMIN], async (req) => {
  try {
    // Get all collections without brand filtering
    const collections: Collection[] = await getCollections();

    return NextResponse.json(collections);
  } catch (error) {
    return handleApiError(error);
  }
});
