import { ROLES } from "@/consts/consts";
import { withAuth } from "@/lib/auth/auth-interceptor";
import {
  StreamEvent,
  Tweaks,
  createStreamingResponseFromReadableStream,
} from "@/lib/langflow/langflow-adapter";
import { getBrandSettings } from "@/lib/services/settings.service";
import { LangflowClient } from "@datastax/langflow-client";
import { InputTypes, OutputTypes } from "@datastax/langflow-client/consts";

// Allow streaming responses up to 300 seconds
export const maxDuration = 300;

export const POST = withAuth<Request>([ROLES.USER], async (req, context) => {
  const { messages, collection, id, language } = await req.json();

  if (!collection) {
    return new Response("Collection name is required", { status: 400 });
  }

  // Get user's brand from auth context
  const userBrand = context.brand;
  if (!userBrand) {
    return new Response("User brand not found in session", { status: 400 });
  }

  try {
    // Get brand-specific settings
    const brandSettings = await getBrandSettings(userBrand);

    if (!brandSettings.langflowApiKey) {
      return new Response("Langflow API key not configured for this brand", {
        status: 400,
      });
    }

    if (!brandSettings.chatFlowId) {
      return new Response("Chat flow ID not configured for this brand", {
        status: 400,
      });
    }

    // Get the last user message for similarity search
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((message: { role: string }) => message.role === "user");

    if (!lastUserMessage) {
      return new Response("No user message found", { status: 400 });
    }

    const client = new LangflowClient({
      apiKey: brandSettings.langflowApiKey,
      baseUrl: process.env.LANGFLOW_BASE_URL || "",
    });

    const sessionId = id || "default_session";

    const tweaks: Tweaks = {
      Qdrant: {
        collection_name: collection,
      },
    };

    // console.log(JSON.stringify(tweaks));

    // Ottieni la risposta in streaming dal LangflowClient
    const response = await client
      .flow(brandSettings.chatFlowId)
      .stream(lastUserMessage.content, {
        input_type: InputTypes.CHAT,
        output_type: OutputTypes.CHAT,
        session_id: sessionId,
        tweaks,
      })
      .catch((error) => {
        console.error("Error during connection to LangFlow:", error);
        throw error;
      });

    // IMPORTANTE: Trasforma direttamente lo stream e restituiscilo come Response
    // Assicurandosi che le intestazioni siano impostate correttamente per lo streaming
    const streamResponse = createStreamingResponseFromReadableStream(
      response as ReadableStream<StreamEvent>
    );

    return streamResponse;
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 }
    );
  }
});
