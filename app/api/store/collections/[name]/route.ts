import { vectorStore } from "@/lib/langchain/vector-store";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { metadata } = await request.json();
    const { name } = params;

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
