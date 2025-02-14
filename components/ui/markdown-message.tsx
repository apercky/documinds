"use client";

import { cn } from "@/lib/utils";
import ReactMarkdown, { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  // Function to detect if text contains markdown
  const containsMarkdown = (text: string): boolean => {
    const markdownPatterns = [
      /[*_`~].*[*_`~]/, // Bold, italic, code
      /^#+\s/m, // Headers
      /^\s*[-*+]\s/m, // Lists
      /^\s*\d+\.\s/m, // Numbered lists
      /\[.*\]\(.*\)/, // Links
      /```[\s\S]*?```/, // Code blocks
      /^\s*>\s/m, // Blockquotes
      /\|.*\|.*\|/, // Tables
      /!\[.*\]\(.*\)/, // Images
    ];
    return markdownPatterns.some((pattern) => pattern.test(text));
  };

  // If no markdown is detected, return plain text
  if (!containsMarkdown(content)) {
    return (
      <div className={cn("whitespace-pre-wrap break-words text-sm", className)}>
        {content}
      </div>
    );
  }

  const components: Components = {
    code({ className, children }) {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";
      const isInline = !match;

      return isInline ? (
        <code
          className={cn("bg-muted px-1 py-0.5 rounded-md text-xs", className)}
        >
          {children}
        </code>
      ) : (
        <div className="bg-muted rounded-md my-0">
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            PreTag="div"
            customStyle={{
              margin: 0,
              background: "transparent",
              fontSize: "0.8rem",
              padding: "0.5rem",
            }}
            wrapLongLines={true}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      );
    },
    // Customize other markdown elements to match our design
    h1: ({ children, ...props }) => (
      <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-base font-bold mt-3 mb-2" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-sm font-bold mt-2 mb-1" {...props}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }) => (
      <p
        className="my-1 break-words overflow-wrap-anywhere whitespace-pre-line text-sm"
        {...props}
      >
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="my-1 list-disc pl-4 text-sm" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="my-1 list-decimal pl-4 text-sm" {...props}>
        {children}
      </ol>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-2 border-border pl-3 my-1 italic text-sm"
        {...props}
      >
        {children}
      </blockquote>
    ),
    a: ({ children, ...props }) => (
      <a
        className="text-primary hover:text-primary/80 underline text-sm"
        {...props}
      >
        {children}
      </a>
    ),
    pre: ({ children, ...props }) => (
      <pre className="my-1 whitespace-pre-wrap text-xs" {...props}>
        {children}
      </pre>
    ),
    img: ({ ...props }) => (
      <img className="rounded-lg my-2 max-w-full h-auto" {...props} />
    ),
  };

  return (
    <div
      className={cn(
        "prose prose-xs dark:prose-invert max-w-none break-words text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
