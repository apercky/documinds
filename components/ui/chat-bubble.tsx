"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MarkdownMessage } from "@/components/ui/markdown-message";
import { MessageLoading } from "@/components/ui/message-loading";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import * as React from "react";
import { useState } from "react";

interface ChatBubbleProps {
  variant?: "sent" | "received";
  className?: string;
  children: React.ReactNode;
}

export function ChatBubble({
  variant = "received",
  className,
  children,
}: ChatBubbleProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 mb-4 max-w-[85%]",
        variant === "sent" ? "flex-row-reverse ml-auto" : "mr-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

interface ChatBubbleMessageProps {
  variant?: "sent" | "received";
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ChatBubbleMessage({
  variant = "received",
  isLoading,
  className,
  children,
}: ChatBubbleMessageProps) {
  const [copied, setCopied] = useState(false);
  const hasContent = !isLoading && typeof children === "string";

  const copyToClipboard = async () => {
    if (typeof children === "string") {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group">
      <div
        className={cn(
          "rounded-lg p-3 min-w-[60px] max-w-full",
          variant === "sent"
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
          variant === "received" && hasContent && "pb-8",
          className
        )}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <MessageLoading />
          </div>
        ) : typeof children === "string" && variant === "received" ? (
          <MarkdownMessage content={children} />
        ) : (
          children
        )}
      </div>
      {hasContent && (
        <ChatBubbleAction
          icon={
            copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )
          }
          onClick={copyToClipboard}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </div>
  );
}

interface ChatBubbleAvatarProps {
  src?: string;
  fallback?: string;
  className?: string;
}

export function ChatBubbleAvatar({
  src,
  fallback = "AI",
  className,
}: ChatBubbleAvatarProps) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {src && <AvatarImage src={src} />}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}

interface ChatBubbleActionProps {
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ChatBubbleAction({
  icon,
  onClick,
  className,
}: ChatBubbleActionProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-6 w-6",
        "p-4",
        "hover:bg-slate-200 dark:hover:bg-slate-700",
        "rounded-md",
        "transition-colors duration-200",
        className
      )}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}

export function ChatBubbleActionWrapper({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-1 mt-2", className)}>
      {children}
    </div>
  );
}
