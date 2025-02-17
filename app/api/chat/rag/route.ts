import { vectorStore } from "@/lib/langchain/vectorStore";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: "strict",
});

const OPENAI_MODEL = "gpt-4o-mini-2024-07-18";
const MAX_CONTEXT_DOCS = 4;

const openaiModel = openai(OPENAI_MODEL);

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, collection } = await req.json();

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

    // Perform similarity search on the collection
    const searchResults = await vectorStore.similaritySearch(
      lastUserMessage.content,
      collection,
      MAX_CONTEXT_DOCS
    );

    // Create context from search results
    const context = searchResults.map((doc) => doc.pageContent).join("\n\n");

    // Add system message with context
    const augmentedMessages = [
      {
        role: "system",
        content: `You are a helpful AI assistant. Use the following context to answer the user's questions:\n\n${context}`,
      },
      ...messages,
    ];

    const result = streamText({
      model: openaiModel,
      messages: augmentedMessages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 }
    );
  }
}
