import { vectorStore } from "@/lib/langchain/vectorStore";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const collections = await vectorStore.getCollections();
    return NextResponse.json(collections);
  } catch (error) {
    console.error("Error getting collections:", error);
    return NextResponse.json(
      { error: "Failed to get collections" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { collectionName } = await request.json();

    if (!collectionName) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    await vectorStore.deleteCollection(collectionName);
    return NextResponse.json({ message: "Collection deleted successfully" });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 }
    );
  }
}
