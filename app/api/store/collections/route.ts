import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { AttributeType } from "@/lib/prisma/generated";
import { getCollections } from "@/lib/services/collection.service";
import { vectorStore } from "@/lib/vs/qdrant/vector-store";
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
    console.error("Error getting collections:", error);
    return NextResponse.json(
      { error: "Failed to get collections" },
      { status: 500 }
    );
  }
});

/**
 * Create a new collection
 */
export const POST = withAuth<NextRequest>(
  [ROLES.EDITOR, ROLES.ADMIN],
  async (req) => {
    try {
      const { name, metadata } = await req.json();

      if (!name) {
        return NextResponse.json(
          { error: "Collection name is required" },
          { status: 400 }
        );
      }

      // Create a new collection
      await vectorStore.createOrGetCollection({
        collectionName: name,
        metadata: metadata || undefined,
      });

      return NextResponse.json({ message: "Collection created successfully" });
    } catch (error) {
      console.error("Error creating collection:", error);
      return NextResponse.json(
        { error: "Failed to create collection" },
        { status: 500 }
      );
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
        return NextResponse.json(
          { error: "Collection name is required" },
          { status: 400 }
        );
      }

      const response = await vectorStore.deleteCollection(collectionName);
      return NextResponse.json({
        message: `Collection deleted successfully ${response.deletedCount} documents`,
      });
    } catch (error) {
      console.error("Error deleting collection:", error);
      return NextResponse.json(
        { error: "Failed to delete collection" },
        { status: 500 }
      );
    }
  }
);
