import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { getCollections } from "@/lib/services/collection.service";
import { NextRequest, NextResponse } from "next/server";

/**
 * Get all collections without brand filtering (admin only)
 */
export const GET = withAuth<NextRequest>([ROLES.ADMIN], async (req) => {
  try {
    // Get all collections without brand filtering
    const collections = await getCollections();

    return NextResponse.json(collections);
  } catch (error) {
    console.error("Error getting all collections:", error);
    return NextResponse.json(
      { error: "Failed to get collections" },
      { status: 500 }
    );
  }
});
