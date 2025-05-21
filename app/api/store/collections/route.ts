import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { AttributeType } from "@/lib/prisma/generated";
import { CreateCollectionRequest } from "@/lib/schemas/collection.schema";
import {
  createCollection,
  deleteCollection,
  getCollections,
} from "@/lib/services/collection.service";
import { handleApiError } from "@/lib/utils/api-error";
import { NextRequest, NextResponse } from "next/server";

/**
 * Get all collections
 */
export const GET = withAuth<NextRequest>([ROLES.USER], async (req) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const brand = searchParams.get("brand");

    const collections = await getCollections({
      attributeFilters: [
        { type: AttributeType.BRAND, value: brand || undefined },
      ],
    });

    return NextResponse.json(collections);
  } catch (error) {
    return handleApiError(error);
  }
});

/**
 * Create a new collection
 */
export const POST = withAuth<NextRequest>(
  [ROLES.EDITOR, ROLES.ADMIN],
  async (req) => {
    try {
      const createCollectionRequest: CreateCollectionRequest = await req.json();

      if (!createCollectionRequest || !createCollectionRequest.name) {
        throw new Error("Collection name is required");
      }

      // Create a new collection
      const collection = await createCollection(createCollectionRequest);
      return NextResponse.json(collection);
    } catch (error) {
      return handleApiError(error);
    }
  }
);

/**
 * Delete a collection
 */
export const DELETE = withAuth<NextRequest>(
  [ROLES.EDITOR, ROLES.ADMIN],
  async (req) => {
    try {
      const { collectionName } = await req.json();

      if (!collectionName) {
        throw new Error("Collection name is required");
      }

      const response = await deleteCollection(collectionName);
      return NextResponse.json(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
);
