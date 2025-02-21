//import CustomPDFLoader from "@/lib/langchain/custom-pdf-loader";
import { documentProcessor } from "@/lib/langchain/document-processor";
import { vectorStore } from "@/lib/langchain/vector-store";
//import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import {
  UnstructuredLoader,
  UnstructuredLoaderOptions,
} from "@langchain/community/document_loaders/fs/unstructured";
import { DocumentLoader } from "@langchain/core/document_loaders/base";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const maxDuration = 1200;

export async function POST(request: NextRequest) {
  console.log("POST method called");
  const encoder = new TextEncoder();
  const customEncode = (chunk: object) =>
    encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const collectionName = formData.get("collectionName") as string;

    console.log("File details:", {
      name: file?.name,
      type: file?.type,
      size: file?.size,
    });

    if (!file || !collectionName) {
      return new Response(
        customEncode({ error: "File and collection name are required" }),
        { status: 400, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    let loader: DocumentLoader;

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("Buffer size:", buffer.length);

    const options: UnstructuredLoaderOptions = {
      apiUrl: process.env.UNSTRUCTURED_API_URL,
      strategy: "fast",
      chunkingStrategy: "by_title",
      extractImageBlockTypes: ["Image", "Table"],
      multiPageSections: true,
      ocrLanguages: ["it", "en"],
      coordinates: true,
    };

    console.log("Unstructured API URL:", options.apiUrl);

    switch (file.type) {
      case "application/pdf":
        console.log(
          "Processing PDF file with options:",
          JSON.stringify(options, null, 2)
        );
        loader = new UnstructuredLoader(
          {
            buffer,
            fileName: file.name,
          },
          options
        );
        break;
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        loader = new UnstructuredLoader(
          {
            buffer,
            fileName: file.name,
          },
          options
        );

        break;
      case "text/plain":
        loader = new TextLoader(file);
        break;
      default:
        loader = new TextLoader(file);
    }

    const docs = await loader.load();
    //console.log(JSON.stringify(docs, null, 2));

    // Delete all documents from the collection
    await vectorStore.deleteDocumentsByMetadata(collectionName, {
      filename: file.name,
    });

    // Create a new ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // const documents: ProcessedDocument[] = docs.map((doc) => {
          //   return {
          //     content: doc.pageContent,
          //     metadata: {
          //       source: file.name,
          //       type: file.type,
          //       size: file.size,
          //     },
          //   };
          // });

          controller.enqueue(
            customEncode({
              type: "status",
              message: "Splitting document into chunks...",
            })
          );

          const splitDocs = await documentProcessor.processUnstructuredDocs(
            docs
          );

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
