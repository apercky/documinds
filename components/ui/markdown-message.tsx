"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
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
  // Preprocess content to remove excessive newlines
  const processContent = (text: string): string => {
    return (
      text
        // Replace multiple blank lines with a single one
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        // Trim whitespace at the start and end
        .trim()
    );
  };

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

  const processedContent = processContent(content);

  // If no markdown is detected, return plain text
  if (!containsMarkdown(processedContent)) {
    return (
      <div className={cn("whitespace-pre-line break-words text-sm", className)}>
        {processedContent}
      </div>
    );
  }

  const components: Components = {
    // Previous component definitions remain the same
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";
      const isInline = !match;

      return isInline ? (
        <code
          className={cn("bg-muted px-1 py-0.5 rounded-md text-xs", className)}
          {...props}
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
      <p className="my-1 break-words overflow-wrap-anywhere text-sm" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="my-1 list-disc pl-4 text-sm space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="my-1 list-decimal pl-4 text-sm space-y-1" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="my-0.5" {...props}>
        {children}
      </li>
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
      <pre className="my-1 text-xs" {...props}>
        {children}
      </pre>
    ),
    img: ({ src, alt }) => {
      if (!src) return null;
      return (
        <Image
          src={src}
          alt={alt || ""}
          width={800}
          height={400}
          className="rounded-lg my-2 max-w-full h-auto"
        />
      );
    },
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
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
