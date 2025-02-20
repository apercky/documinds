"use client";

import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ui/chat-input";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { useChat } from "@ai-sdk/react";
import { CornerDownLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { MemoizedChatBubble } from "./chat-bubble-message";

export default function Chat() {
  const searchParams = useSearchParams();
  const collection = searchParams.get("collection");
  const chatId = searchParams.get("chatId") || undefined;

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/chat/rag",
    body: {
      collection,
    },
    id: chatId,
  });

  useEffect(() => {
    console.log("chatId", chatId);
  }, [chatId]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit(e);
    },
    [handleSubmit]
  );

  if (!collection) {
    return (
      <div className="mt-6 h-[calc(100vh-75px)] bg-gradient-to-b from-background to-slate-50 dark:from-background dark:to-slate-950 rounded-lg flex flex-col">
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Please select a collection from the sidebar
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 h-[calc(100vh-75px)] bg-gradient-to-b from-background to-slate-50 dark:from-background dark:to-slate-950 rounded-lg flex flex-col">
      <div className="flex-1 w-full overflow-hidden">
        <ChatMessageList className="scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {messages.map((message) => (
            <MemoizedChatBubble key={message.id} message={message} />
          ))}

          {status === "streaming" && (
            <MemoizedChatBubble
              message={{ role: "assistant", content: "", id: "loading" }}
              isLoading
            />
          )}
        </ChatMessageList>
      </div>

      <div className="p-4">
        <form
          onSubmit={onSubmit}
          className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1"
        >
          <ChatInput
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                  onSubmit(e);
                }
              }
            }}
          />
          <div className="flex items-center p-3 pt-0 justify-between">
            <p className="text-xs text-muted-foreground">
              Press{" "}
              <kbd className="px-1 py-0.5 text-[10px] font-mono border rounded-md">
                Shift + ↵
              </kbd>{" "}
              for new line
            </p>
            <Button
              type="submit"
              size="sm"
              className="ml-auto gap-1.5"
              disabled={!input.trim()}
            >
              Send Message
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
