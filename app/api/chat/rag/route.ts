import { vectorStore } from "@/lib/langchain/vector-store";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { LangChainAdapter, Message } from "ai";
import { formatDocumentsAsString } from "langchain/util/document";

// Initialize the Chat Model with streaming
const chatModel = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.0,
  maxRetries: 5,
  streaming: true,
});

// Create the main RAG prompt template
const SYSTEM_TEMPLATE = `You are a helpful AI assistant. Use the following context to answer the user's questions.

Context:
{context}

Chat History:
{chat_history}

**Respond in the language of the user's question. If you don't know the answer, just say that "Sorry, you don't know.". Don't try to make up an answer.**

**Respond in markdown format.**`;

const prompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
  new MessagesPlaceholder("chat_history"),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);

// Convert Vercel AI messages to LangChain messages
function convertToLangChainMessages(messages: Message[]) {
  return messages.slice(0, -1).map((message) => {
    if (message.role === "user") {
      return new HumanMessage(message.content);
    }
    return new AIMessage(message.content);
  });
}

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
      .find((message: Message) => message.role === "user");

    if (!lastUserMessage) {
      return new Response("No user message found", { status: 400 });
    }

    // Fetch relevant documents and prepare inputs
    const retrieverVectorStore = await vectorStore.createOrGetCollection({
      collectionName: collection,
      distance: "cosine",
    });

    const retriver = retrieverVectorStore.asRetriever({
      k: 4,
    });

    const docs = await retriver.invoke(lastUserMessage.content, {
      maxConcurrency: 1,
      metadata: {},
    });

    //  const docs = await vectorStore.similaritySearch(
    //    lastUserMessage.content,
    //    collection,
    //    4
    //  );

    console.log(`Last user message: ${lastUserMessage.content}`);
    console.log(`Collection: ${collection}`);
    console.log(`Docs: ${docs.map((doc) => doc.pageContent)}`);

    const inputs = {
      context: formatDocumentsAsString(docs),
      chat_history: convertToLangChainMessages(messages),
      input: lastUserMessage.content,
    };

    // Create the chain
    const chain = RunnableSequence.from([
      prompt,
      chatModel,
      new StringOutputParser(),
    ]);

    // Start the streaming response
    const stream = await chain.stream(inputs);

    return LangChainAdapter.toDataStreamResponse(stream);
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 }
    );
  }
}
