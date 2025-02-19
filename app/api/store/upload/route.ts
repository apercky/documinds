//import CustomPDFLoader from "@/lib/langchain/custom-pdf-loader";
import {
  documentProcessor,
  ProcessedDocument,
} from "@/lib/langchain/document-processor";
import { vectorStore } from "@/lib/langchain/vector-store";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocumentLoader } from "@langchain/core/document_loaders/base";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  console.log("POST method called");
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

    let loader: DocumentLoader;

    switch (file.type) {
      case "application/pdf":
        loader = new PDFLoader(file);
        break;
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        loader = new DocxLoader(file);
        break;
      case "text/plain":
        loader = new TextLoader(file);
        break;
      default:
        loader = new TextLoader(file);
    }

    const docs = await loader.load();

    // Delete all documents from the collection
    await vectorStore.deleteDocumentsByMetadata(collectionName, {
      filename: file.name,
    });

    // Create a new ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const documents: ProcessedDocument[] = docs.map((doc) => {
            return {
              content: doc.pageContent,
              metadata: {
                source: file.name,
                type: file.type,
                size: file.size,
              },
            };
          });

          controller.enqueue(
            customEncode({
              type: "status",
              message: "Splitting document into chunks...",
            })
          );

          const splitDocs = await documentProcessor.splitDocuments(documents);

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
