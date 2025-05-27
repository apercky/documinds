import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { updateCollectionAttributes } from "@/lib/services/collection.service";
import { handleApiError } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";

/**
 * Update the attributes of a collection
 */
export const PUT = withAuth<NextRequest, { params: Promise<{ id: string }> }>(
  [ROLES.EDITOR, ROLES.ADMIN],
  async (req, context) => {
    try {
      const body = await req.json();
      const { attributes } = body;

      if (!context || !context.params) {
        return NextResponse.json(
          { error: "Missing route parameters" },
          { status: 400 }
        );
      }

      const { id } = await context.params;

      if (!id) {
        throw new Error("Collection ID is required");
      }

      if (!attributes || !Array.isArray(attributes)) {
        throw new Error("Attributes must be an array");
      }

      const updatedCollection = await updateCollectionAttributes(
        id,
        attributes
      );

      return NextResponse.json(updatedCollection);
    } catch (error) {
      return handleApiError(error);
    }
  }
);
