import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // custom settings, e.g.
  compatibility: "strict", // strict mode, enable when using the OpenAI API
});

const ANTHROPIC_MODEL = "claude-3-5-sonnet-20240620";
const OPENAI_MODEL = "gpt-4o-mini-2024-07-18";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // custom settings
});

const openaiModel = openai(OPENAI_MODEL);
const anthropicModel = anthropic(ANTHROPIC_MODEL);
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  console.log(messages);
  try {
    const result = streamText({
      model: anthropicModel,
      messages,
    });

    console.log(result);
    return result.toDataStreamResponse();
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
