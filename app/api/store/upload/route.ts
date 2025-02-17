import { vectorStore } from "@/lib/langchain/vectorStore";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const customEncode = (chunk: object) =>
    encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const collectionName = formData.get("collectionName") as string;

    if (!file || !collectionName) {
      return new Response(
        customEncode({ error: "File and collection name are required" }),
        { status: 400, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    // Delete all documents from the collection
    await vectorStore.deleteDocumentsByMetadata(collectionName, {
      filename: file.name,
    });

    // Create a new ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Read file content
          const text = await file.text();

          // Split text into chunks
          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
          });

          controller.enqueue(
            customEncode({
              type: "status",
              message: "Splitting document into chunks...",
            })
          );

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

          console.log("splitDocs", splitDocs);
          // Add documents to collection with progress updates
          await vectorStore.addDocuments(
            splitDocs,
            collectionName,
            100,
            (progress) => {
              controller.enqueue(
                customEncode({
                  type: "progress",
                  ...progress,
                })
              );
            }
          );

          // Send completion message
          controller.enqueue(
            customEncode({
              type: "complete",
              message: "Processing complete",
              documentCount: splitDocs.length,
            })
          );

          controller.close();
        } catch (error) {
          controller.enqueue(
            customEncode({
              type: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
            })
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      customEncode({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { "Content-Type": "text/event-stream" } }
    );
  }
}
