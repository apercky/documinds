//import CustomPDFLoader from "@/lib/langchain/custom-pdf-loader";
import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import { Tweaks } from "@/lib/langflow/langflow-adapter";
import { LangflowClient } from "@datastax/langflow-client";
import { InputTypes, OutputTypes } from "@datastax/langflow-client/consts";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const maxDuration = 1200;

export const POST = withAuth<NextRequest>(
  [ROLES.EDITOR, ROLES.ADMIN],
  async (req) => {
    const encoder = new TextEncoder();
    const customEncode = (chunk: object) =>
      encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);

    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const collectionName = formData.get("collectionName") as string;

      if (!file || !collectionName) {
        return new Response(
          customEncode({ error: "File and collection name are required" }),
          { status: 400, headers: { "Content-Type": "text/event-stream" } }
        );
      }

      // Initialize LangFlow client
      const client = new LangflowClient({
        apiKey: process.env.LANGFLOW_API_KEY || "",
        baseUrl: process.env.LANGFLOW_BASE_URL || "",
      });

      // Get flow ID from environment variables
      const flowId = process.env.LANGFLOW_FLOW_EMBEDDINGS_ID || "";

      if (!flowId) {
        return new Response(
          customEncode({
            error: "LANGFLOW_FLOW_EMBEDDINGS_ID is not configured",
          }),
          { status: 500, headers: { "Content-Type": "text/event-stream" } }
        );
      }

      // Create a new ReadableStream for SSE
      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(
              customEncode({
                type: "status",
                message: "Uploading file to LangFlow...",
              })
            );

            // Upload the file to LangFlow
            const flow = client.flow(flowId);

            // First we need to save the file temporarily to get a path
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Create a temporary file path
            const tempFilePath = `/tmp/${file.name}`;
            const fs = require("fs");
            fs.writeFileSync(tempFilePath, buffer);

            // Upload the file to LangFlow using the path
            const uploadedFile = await flow.uploadFile(tempFilePath);

            if (!uploadedFile || !uploadedFile.filePath) {
              throw new Error("Failed to upload file to LangFlow");
            }

            // Clean up the temporary file
            fs.unlinkSync(tempFilePath);

            controller.enqueue(
              customEncode({
                type: "status",
                message: "Processing document...",
              })
            );

            // Configure tweaks for the embedding flow
            const tweaks: Tweaks = {
              Qdrant: {
                collection_name: collectionName,
              },
              PDFLoader: {
                pdf_file: uploadedFile.filePath,
              },
            };

            // Execute the flow with tweaks
            const result = await flow.run("", {
              input_type: InputTypes.TEXT,
              output_type: OutputTypes.TEXT,
              tweaks,
            });

            // Check if result has a valid sessionId to confirm success
            if (!result || !result.sessionId) {
              throw new Error(
                "Failed to process document: No session ID returned"
              );
            }

            // Send completion message with sessionId as confirmation
            controller.enqueue(
              customEncode({
                type: "complete",
                message: "Processing complete",
                session_id: result.sessionId,
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
