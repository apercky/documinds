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
      <div className={cn("whitespace-pre-wrap break-words", className)}>
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
        <code className={cn("bg-muted px-1 py-0.5 rounded-md", className)}>
          {children}
        </code>
      ) : (
        <div className="bg-muted rounded-md my-0">
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            PreTag="div"
            customStyle={{ margin: 0, background: "transparent" }}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      );
    },
    // Customize other markdown elements to match our design
    h1: ({ children, ...props }) => (
      <h1 className="text-2xl font-bold mt-6 mb-4 first:mt-0" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-xl font-bold mt-5 mb-3" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-lg font-bold mt-4 mb-2" {...props}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }) => (
      <p
        className="my-2 break-words overflow-wrap-anywhere whitespace-pre-line"
        {...props}
      >
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="my-2 list-disc pl-6" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="my-2 list-decimal pl-6" {...props}>
        {children}
      </ol>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-2 border-border pl-4 my-2 italic"
        {...props}
      >
        {children}
      </blockquote>
    ),
    a: ({ children, ...props }) => (
      <a className="text-primary hover:text-primary/80 underline" {...props}>
        {children}
      </a>
    ),
    pre: ({ children, ...props }) => (
      <pre
        className="my-2 overflow-x-auto max-w-[calc(100vw-4rem)] whitespace-pre-wrap"
        {...props}
      >
        {children}
      </pre>
    ),
    img: ({ ...props }) => (
      <img className="rounded-lg my-4 max-w-full h-auto" {...props} />
    ),
  };

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
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
