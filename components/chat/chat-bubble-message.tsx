"use client";

import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/ui/chat-bubble";
import { Message } from "ai";
import { memo } from "react";

interface ChatBubbleMessageProps {
  message: Message;
  isLoading?: boolean;
}

const ChatBubbleMessageComponent = ({
  message,
  isLoading,
}: ChatBubbleMessageProps) => (
  <ChatBubble
    variant={message.role === "user" ? "sent" : "received"}
    className={isLoading ? "justify-center items-center" : ""}
  >
    <ChatBubbleAvatar
      className="h-8 w-8 shrink-0"
      src={
        message.role === "user"
          ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
          : "https://no-image.png"
      }
      fallback={message.role === "user" ? "US" : "AI"}
    />
    <ChatBubbleMessage
      variant={message.role === "user" ? "sent" : "received"}
      className="whitespace-pre-wrap"
      isLoading={isLoading}
    >
      {message.content}
    </ChatBubbleMessage>
  </ChatBubble>
);

export const MemoizedChatBubble = memo(ChatBubbleMessageComponent);
MemoizedChatBubble.displayName = "MemoizedChatBubble";
