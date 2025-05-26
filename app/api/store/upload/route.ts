//import CustomPDFLoader from "@/lib/langchain/custom-pdf-loader";
import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { documentProcessor } from "@/lib/langchain/document-processor";
import { vectorStore } from "@/lib/vs/qdrant/vector-store";
import type { DocumentMetadata } from "@/types/document";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocumentLoader } from "@langchain/core/document_loaders/base";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const maxDuration = 1200;

export const POST = withAuth<NextRequest>(
  [ROLES.EDITOR, ROLES.ADMIN],
  async (req) => {
    process.env.NODE_ENV === "development" && console.log("POST method called");

    const encoder = new TextEncoder();
    const customEncode = (chunk: object) =>
      encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);

    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const collectionName = formData.get("collectionName") as string;

      const documentMetadata: DocumentMetadata = {
        name: file?.name,
        type: file?.type,
        size: file?.size,
      };

      process.env.NODE_ENV === "development" &&
        console.log("File details:", documentMetadata);

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

      // Create a new ReadableStream for SSE
      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(
              customEncode({
                type: "status",
                message: "Splitting document into chunks...",
              })
            );

            const splitDocs = await documentProcessor.splitDocuments(docs);

            // Add documents to collection with progress updates
            await vectorStore.addDocuments(
              splitDocs,
              collectionName,
              documentMetadata,
              10,
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
);
