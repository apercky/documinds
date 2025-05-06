"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import ReactMarkdown, { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { darcula } from "react-syntax-highlighter/dist/cjs/styles/prism";
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
            style={darcula}
            PreTag="div"
            customStyle={{
              margin: 0,
              background: "transparent",
              fontSize: "0.8rem",
              padding: "0.5rem",
            }}
            //wrapLongLines={true}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      );
    },
    h1: ({ children, node: _node, ...props }) => {
      return (
        <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0" {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ children, node: _node, ...props }) => {
      return (
        <h2 className="text-base font-bold mt-3 mb-2" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ children, node: _node, ...props }) => {
      return (
        <h3 className="text-sm font-bold mt-2 mb-1" {...props}>
          {children}
        </h3>
      );
    },
    p: ({ children, node: _node, ...props }) => {
      // Check if this paragraph is inside a list item by examining the node
      // Use optional chaining to safely access properties
      const isInListItem =
        _node &&
        typeof _node === "object" &&
        "parent" in _node &&
        _node.parent &&
        typeof _node.parent === "object" &&
        "type" in _node.parent &&
        _node.parent.type === "listItem";

      // Exclude node from props to prevent it from being rendered in HTML
      return (
        <p
          className={cn(
            "break-words overflow-wrap-anywhere text-sm",
            isInListItem ? "my-0 leading-tight" : "my-1"
          )}
          {...props}
        >
          {children}
        </p>
      );
    },
    ul: ({ children, node: _node, ...props }) => {
      return (
        <ul
          className="list-disc pl-4 text-sm space-y-0 [&>li]:whitespace-normal leading-none p-0 m-0"
          {...props}
        >
          {children}
        </ul>
      );
    },
    ol: ({ children, node: _node, ...props }) => {
      return (
        <ol
          className="list-decimal pl-4 text-sm space-y-0 [&>li]:whitespace-normal leading-none p-0 m-0"
          {...props}
        >
          {children}
        </ol>
      );
    },
    li: ({ children, node: _node, ...props }) => {
      // Exclude node from props to prevent it from being rendered in HTML
      return (
        <li className="whitespace-normal leading-tight p-0 mb-0" {...props}>
          {children}
        </li>
      );
    },
    blockquote: ({ children, node: _node, ...props }) => {
      return (
        <blockquote
          className="border-l-2 border-border pl-3 my-1 italic text-sm"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    a: ({ children, node: _node, ...props }) => {
      return (
        <a
          className="text-primary hover:text-primary/80 underline text-sm"
          {...props}
        >
          {children}
        </a>
      );
    },
    pre: ({ children, node: _node, ...props }) => {
      return (
        <pre className="my-1 text-xs" {...props}>
          {children}
        </pre>
      );
    },
    img: ({ src, alt, node: _node }) => {
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
        "prose prose-xs dark:prose-invert max-w-none break-words text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_li]:whitespace-normal [&_ol]:leading-none [&_ul]:leading-none [&_ol]:my-0 [&_ul]:my-0 [&_li_p]:my-0 [&_li_p]:leading-tight",
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
