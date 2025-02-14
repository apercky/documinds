import { vectorStoreManager } from "@/lib/langchain/vectorStore";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const collections = await vectorStoreManager.getCollections();
    return NextResponse.json(collections);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch collections: " + errorMessage },
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

    await vectorStoreManager.deleteCollection(collectionName);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete collection: " + errorMessage },
      { status: 500 }
    );
  }
}
