import { LangChainAdapter } from "ai";

// Types to match LangFlow's response format

type TokenStreamEvent = {
  event: "token";
  data: {
    chunk: string;
    id: string;
    timestamp: string;
  };
};

type AddMessageStreamEvent = {
  event: "add_message";
  data: {
    timestamp: string;
    sender: string;
    sender_name: string;
    session_id: string;
    text: string;
    id: string;
    flow_id: string;
    // ... other fields
  };
};

type EndStreamEvent = {
  event: "end";
  data: {
    result: {
      session_id: string;
      outputs: Array<{
        inputs: unknown;
        outputs: Array<unknown>;
      }>;
    };
  };
};

export type Tweak = Record<string, string | number | null | boolean>;
export type Tweaks = Record<string, Tweak | string>;

export type StreamEvent =
  | TokenStreamEvent
  | AddMessageStreamEvent
  | EndStreamEvent;

/**
 * Creates a streaming response from a ReadableStream<StreamEvent>
 */
export function createStreamingResponseFromReadableStream(
  stream: ReadableStream<StreamEvent>
) {
  const textStream = new ReadableStream<string>({
    async start(controller) {
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value.event === "token" && value.data.chunk) {
            controller.enqueue(value.data.chunk);
          }
        }
        controller.close();
      } catch (e) {
        console.error("Error reading stream:", e);
        controller.error(e);
      } finally {
        reader.releaseLock();
      }
    },
  });

  return LangChainAdapter.toDataStreamResponse(textStream);
}

/**
 * Creates a streaming response using Vercel AI
 */
export function createStreamingResponse(response: Response) {
  if (!response.body) {
    throw new Error("Response body is null");
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  const stream = new ReadableStream<string>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const event = JSON.parse(line) as StreamEvent;
              if (event.event === "token" && event.data.chunk) {
                controller.enqueue(event.data.chunk);
              }
            } catch (e) {
              console.error("Error parsing event:", e);
            }
          }
        }
        controller.close();
      } catch (e) {
        console.error("Error reading stream:", e);
        controller.error(e);
      } finally {
        reader.releaseLock();
      }
    },
  });

  return LangChainAdapter.toDataStreamResponse(stream);
}

/**
 * Calls LangFlow API and returns a streaming response compatible with Vercel AI
 */
export async function callLangFlow(
  message: string,
  flowId: string,
  apiKey: string,
  baseUrl: string = "http://127.0.0.1:7860",
  tweaks: Tweaks = {}
) {
  const response = await fetch(`${baseUrl}/api/v1/run/${flowId}?stream=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      input_value: message,
      output_type: "chat",
      input_type: "chat",
      tweaks,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to call LangFlow: ${response.status} ${response.statusText}`
    );
  }

  return createStreamingResponse(response);
}
