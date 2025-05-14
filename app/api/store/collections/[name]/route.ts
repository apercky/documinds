import { checkAuth } from "@/lib/auth/server-helpers";
import { vectorStore } from "@/lib/vs/qdrant/vector-store";
import { NextRequest, NextResponse } from "next/server";

/**
 * Update the metadata of a collection
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  // Authentication check
  const authResponse = await checkAuth(request);
  if (authResponse) return authResponse;

  try {
    const { metadata } = await request.json();
    const { name } = await params;

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
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  // Authentication check
  const authResponse = await checkAuth(request);
  if (authResponse) return authResponse;

  try {
    const { name } = await params;

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
}
