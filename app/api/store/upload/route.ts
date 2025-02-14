import { documentProcessor } from "@/lib/langchain/documentProcessor";
import { vectorStoreManager } from "@/lib/langchain/vectorStore";
import { NextRequest, NextResponse } from "next/server";

type UploadRequest = {
  documents: Array<{
    content: string;
    metadata: {
      source: string;
      type: string;
      size: number;
    };
  }>;
  collectionName: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UploadRequest;
    const { documents, collectionName } = body;

    if (!documents || !collectionName) {
      return NextResponse.json(
        { error: "Missing documents or collection name" },
        { status: 400 }
      );
    }

    // Split documents into chunks
    const splitDocs = await documentProcessor.splitDocuments(documents);

    // Add the chunked documents to the vector store
    await vectorStoreManager.addDocuments(splitDocs, collectionName);

    return NextResponse.json({
      success: true,
      chunks: splitDocs.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to upload documents: " + errorMessage },
      { status: 500 }
    );
  }
}
