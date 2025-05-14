import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { vectorStore } from "@/lib/vs/qdrant/vector-store";
import { NextRequest, NextResponse } from "next/server";

/**
 * Update the metadata of a collection
 */
export const PATCH = withAuth<
  NextRequest,
  { params: Promise<{ name: string }> }
>([ROLES.EDITOR, ROLES.ADMIN], async (req, context) => {
  try {
    const { metadata } = await req.json();

    if (!context || !context.params) {
      return NextResponse.json(
        { error: "Missing route parameters" },
        { status: 400 }
      );
    }

    const { name } = await context.params;

    if (!name) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    await vectorStore.updateCollectionMetadata(name, metadata);

    return NextResponse.json({ message: "Collection updated successfully" });
  } catch (error) {
    console.error("Error updating collection:", error);
    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth<
  NextRequest,
  { params: Promise<{ name: string }> }
>([ROLES.EDITOR, ROLES.ADMIN], async (req, context) => {
  try {
    if (!context || !context.params) {
      return NextResponse.json(
        { error: "Missing route parameters" },
        { status: 400 }
      );
    }

    const { name } = await context.params;

    if (!name) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    const result = await vectorStore.deleteCollectionDocuments(name);

    return NextResponse.json({
      message: "Collection documents deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting collection documents:", error);
    return NextResponse.json(
      { error: "Failed to delete collection documents" },
      { status: 500 }
    );
  }
});
