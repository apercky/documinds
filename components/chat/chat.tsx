"use client";

import { SessionExpiredDialog } from "@/components/session-expired-dialog";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ui/chat-input";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { useChat } from "@ai-sdk/react";
import { CornerDownLeft, StopCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { MemoizedChatBubble } from "./chat-bubble-message";

export default function Chat() {
  const searchParams = useSearchParams();
  const collection = searchParams.get("collection");
  const chatId = searchParams.get("chatId") || undefined;
  const language = useLocale();
  const t = useTranslations("Languages");
  const tCommon = useTranslations("Common");
  const [sessionExpired, setSessionExpired] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop,
    error,
  } = useChat({
    api: "/api/chat",
    body: {
      collection,
      language: t(language),
    },
    id: chatId,
    onError: (error) => {
      // Check if the error is related to authentication (401)
      if (
        error.message &&
        (error.message.includes("401") ||
          error.message.includes("Unauthorized") ||
          error.message.includes("Not authenticated") ||
          error.message.includes("Authentication required"))
      ) {
        // Silently handle authentication errors by showing the dialog
        setSessionExpired(true);
        return; // Prevent the error from propagating to the default handler
      }

      // For other errors, let them be handled by the default handler
      console.error("Chat error:", error);
    },
  });

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
          {tCommon("selectCollection", {
            defaultValue: "Please select a collection from the sidebar",
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 h-[calc(100vh-75px)] bg-gradient-to-b from-background to-slate-50 dark:from-background dark:to-slate-950 rounded-lg flex flex-col">
      {/* Session Expired Dialog */}
      <SessionExpiredDialog
        isOpen={sessionExpired}
        onOpenChange={setSessionExpired}
      />

      <div className="flex-1 w-full overflow-hidden">
        <ChatMessageList className="scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {messages.map((message) => (
            <MemoizedChatBubble key={message.id} message={message} />
          ))}

          {status === "streaming" && (
            <>
              <MemoizedChatBubble
                message={{ role: "assistant", content: "", id: "loading" }}
                isLoading
              />
              <div className="flex justify-center mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => stop()}
                >
                  <StopCircle className="h-4 w-4" />
                  {tCommon("stopGenerating", {
                    defaultValue: "Stop generating",
                  })}
                </Button>
              </div>
            </>
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
            placeholder={tCommon("typeMessage", {
              defaultValue: "Type your message...",
            })}
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
              {tCommon("pressShiftEnter", {
                defaultValue: "Press Shift + ↵ for new line",
              })}{" "}
              <kbd className="px-1 py-0.5 text-[10px] font-mono border rounded-md">
                Shift + ↵
              </kbd>
            </p>
            <Button
              type="submit"
              size="sm"
              className="ml-auto gap-1.5"
              disabled={!input.trim()}
            >
              {tCommon("sendMessage", { defaultValue: "Send Message" })}
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
