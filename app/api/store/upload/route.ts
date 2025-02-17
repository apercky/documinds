import { vectorStore } from "@/lib/langchain/vectorStore";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const collectionName = formData.get("collectionName") as string;

    if (!file || !collectionName) {
      return NextResponse.json(
        { error: "File and collection name are required" },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await splitter.createDocuments(
      [text],
      [
        {
          filename: file.name,
          filetype: file.type,
          filesize: file.size,
        },
      ]
    );

    // Add documents to collection
    await vectorStore.addDocuments(splitDocs, collectionName);

    return NextResponse.json({
      message: "Documents added successfully",
      documentCount: splitDocs.length,
    });
  } catch (error) {
    console.error("Error uploading documents:", error);
    return NextResponse.json(
      { error: "Failed to upload documents" },
      { status: 500 }
    );
  }
}
