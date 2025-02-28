import { vectorStore } from "@/lib/langchain/vector-store";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { metadata } = await request.json();
    const { name } = await params;

    if (!name) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    await vectorStore.updateCollection(name, metadata);

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
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;

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
