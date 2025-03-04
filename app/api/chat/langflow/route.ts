//import { callLangFlow } from "@/lib/langflow-adapter";
import {
  StreamEvent,
  Tweaks,
  createStreamingResponseFromReadableStream,
} from "@/lib/langflow-adapter";
import { LangflowClient } from "@datastax/langflow-client";
import { InputTypes, OutputTypes } from "@datastax/langflow-client/consts";

// Allow streaming responses up to 300 seconds
export const maxDuration = 300;

export async function POST(req: Request) {
  const { messages, collection, id, language } = await req.json();

  if (!collection) {
    return new Response("Collection name is required", { status: 400 });
  }

  try {
    // Get the last user message for similarity search
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((message: { role: string }) => message.role === "user");

    if (!lastUserMessage) {
      return new Response("No user message found", { status: 400 });
    }

    console.log("Starting stream with message:", lastUserMessage.content);

    const client = new LangflowClient({
      apiKey: process.env.LANGFLOW_API_KEY || "",
      baseUrl: process.env.LANGFLOW_BASE_URL || "",
    });

    const sessionId = id || "default_session";

    console.log("Session ID:", sessionId);
    console.log("Language:", language);

    const tweaks: Tweaks = {
      "ChatInput-looVc": {
        session_id: sessionId,
      },
      "CustomComponent-NuPci": {
        collection_name: collection,
      },
      "TextInput-XSObq": {
        input_value: language,
      },
    };
    const tweaksAgentic: Tweaks = {
      "ChatInput-4HspM": {},
      "ChatOutput-tpsRQ": {},
      "Chroma DB advanced-FHLNv": {
        collection_name: collection,
      },
      "OpenAIEmbeddings-aJVuv": {},
      "Agent-ZGp1M": {},
    };

    const response = await client
      .flow(process.env.LANGFLOW_FLOW_ID || "")
      .stream(lastUserMessage.content, {
        input_type: InputTypes.CHAT,
        output_type: OutputTypes.CHAT,
        session_id: sessionId,
        tweaks,
      });

    return createStreamingResponseFromReadableStream(
      response as ReadableStream<StreamEvent>
    );
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 }
    );
  }
}
