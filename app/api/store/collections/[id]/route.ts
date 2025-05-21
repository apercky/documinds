import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import {
  getCollectionById,
  updateCollectionAttributes,
} from "@/lib/services/collection.service";
import { handleApiError } from "@/lib/utils/api-error";
import { vectorStore } from "@/lib/vs/qdrant/vector-store";
import { NextRequest, NextResponse } from "next/server";

/**
 * Get a collection by ID
 */
export const GET = withAuth<NextRequest, { params: Promise<{ id: string }> }>(
  [ROLES.USER],
  async (req, context) => {
    try {
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

      const collection = await getCollectionById(id);

      if (!collection) {
        throw new Error("Collection not found");
      }

      return NextResponse.json(collection);
    } catch (error) {
      return handleApiError(error);
    }
  }
);

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

/**
 * Delete documents from a collection
 */
export const DELETE = withAuth<
  NextRequest,
  { params: Promise<{ id: string }> }
>([ROLES.EDITOR, ROLES.ADMIN], async (req, context) => {
  try {
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

    // Get the collection first to get its name
    const collection = await getCollectionById(id);

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Delete the documents from the vector store
    const result = await vectorStore.deleteCollectionDocuments(collection.name);

    return NextResponse.json({
      message: "Collection documents deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
