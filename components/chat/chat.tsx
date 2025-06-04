"use client";

import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ui/chat-input";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { CornerDownLeft, StopCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { MemoizedChatBubble } from "./chat-bubble-message";
import { CollectionList } from "./collection-list";

export default function Chat() {
  const searchParams = useSearchParams();
  const collection = searchParams.get("collection");
  const chatId = searchParams.get("chatId") || undefined;
  const language = useLocale();
  const t = useTranslations("Languages");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  // Hook per la gestione centralizzata degli errori
  const { handleError, ErrorDialogComponent } = useErrorHandler();

  // Use a combined key of collection and chatId to force useChat to reset when either changes
  const chatKey = `${collection || "none"}-${chatId || "default"}`;
  console.log("chatKey", chatKey);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop,
    error,
    setInput,
    setData,
  } = useChat({
    api: "/api/chat",
    body: {
      collection,
      language: t(language),
    },
    id: chatId,
    // The key property forces a complete reset of the hook state when it changes
    key: chatKey,
    onError: (error) => {
      // Per tutti gli errori, utilizziamo il nostro handler centralizzato
      // La gestione degli errori 401/sessione scaduta è ora centralizzata nel TokenRefreshHandler
      handleError(error);
    },
  });

  // When collection or chatId changes, clear the input field and any cached messages
  useEffect(() => {
    // Reset input field on collection/chatId change
    setInput("");

    // Reset any messages
    setData([]);

    console.log(`Collection or chatId changed: ${chatKey}`);
  }, [collection, chatId, setInput, setData, chatKey]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit(e);

      // Nascondi la tastiera mobile rimuovendo il focus dall'input
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    [handleSubmit]
  );

  const handleSelectCollection = (collectionName: string) => {
    const newChatId = Date.now().toString();
    router.push(`/dashboard?collection=${collectionName}&chatId=${newChatId}`);
  };

  if (!collection) {
    return <CollectionList onSelectCollection={handleSelectCollection} />;
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Chat messages list */}
        <div className="flex flex-1 h-[calc(100dvh-7.5rem)] overflow-hidden">
          <ChatMessageList>
            {messages.map((message: Message) => (
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
                    {tCommon("stopGenerating")}
                  </Button>
                </div>
              </>
            )}
          </ChatMessageList>
        </div>

        {/* Chat bar with input and send button */}
        <div className="pl-4 pr-4 pb-4 sticky bottom-0 bg-transparent dark:bg-transparent">
          <form
            onSubmit={onSubmit}
            className="border rounded-lg bg-background dark:bg-background focus-within:ring-1 focus-within:ring-ring p-1"
          >
            <ChatInput
              value={input}
              onChange={handleInputChange}
              placeholder={tCommon("typeMessage")}
              className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0 scrollbar-hide"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) {
                    onSubmit(e);
                    // Nascondi la tastiera mobile
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }
                }
              }}
            />
            <div className="sticky bottom-0 flex items-center px-3 pt-2 pb-1.5 justify-between">
              <p className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
                {tCommon("pressShiftEnter")}{" "}
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
                {tCommon("sendMessage")}
                <CornerDownLeft className="size-3.5" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Error Dialog gestito dal nostro hook centralizzato */}
      <ErrorDialogComponent />
    </>
  );
}
