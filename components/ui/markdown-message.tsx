"use client";

import { cn } from "@/lib/utils";
import { SourceCitation } from "@/lib/utils/source-citations";
import Image from "next/image";
import ReactMarkdown, { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { darcula } from "react-syntax-highlighter/dist/cjs/styles/prism";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { SourceCitationBadge } from "./source-citation";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  // Simple citation processing - extract citations and replace with placeholders
  const citations = new Map<number, SourceCitation>();
  let citationNumber = 1;

  // Replace citations with placeholders and collect citation data
  const processedContent = content.replace(
    /\[src name="([^"]+)" page="(\d+)" total_pages="(\d+)"\]/g,
    (match, filename, page, totalPages) => {
      const citation: SourceCitation = {
        filename,
        page: parseInt(page, 10),
        totalPages: parseInt(totalPages, 10),
        originalText: match,
      };

      citations.set(citationNumber, citation);
      const placeholder = `<span class="citation-marker" data-citation="${citationNumber}">${citationNumber}</span>`;
      citationNumber++;

      return placeholder;
    }
  );

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

  const finalProcessedContent = processContent(processedContent);

  // If no markdown is detected, render as plain text with citations
  if (!containsMarkdown(finalProcessedContent)) {
    // Parse the content to replace citation markers with React components
    const parts = finalProcessedContent.split(
      /(<span class="citation-marker" data-citation="\d+">\d+<\/span>)/
    );

    return (
      <div className={cn("whitespace-pre-line break-words text-sm", className)}>
        {parts.map((part, index) => {
          const citationMatch = part.match(
            /<span class="citation-marker" data-citation="(\d+)">(\d+)<\/span>/
          );

          if (citationMatch) {
            const citationId = parseInt(citationMatch[1], 10);
            const number = parseInt(citationMatch[2], 10);
            const citation = citations.get(citationId);

            if (citation) {
              return (
                <SourceCitationBadge
                  key={`citation-${index}`}
                  citation={citation}
                  number={number}
                />
              );
            }
          }

          return part;
        })}
      </div>
    );
  }

  const components: Components = {
    // Handle citation markers in markdown
    span: ({ className, children, ...props }: any) => {
      const spanClassName = className || props.className;

      if (
        spanClassName?.includes("citation-marker") ||
        props["data-citation"]
      ) {
        const citationId = props["data-citation"];
        if (citationId) {
          const citation = citations.get(parseInt(citationId, 10));
          const number = parseInt(children as string, 10);

          if (citation) {
            return <SourceCitationBadge citation={citation} number={number} />;
          }
        }
      }

      return (
        <span className={spanClassName} {...props}>
          {children}
        </span>
      );
    },
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
      // Check if this paragraph is inside a list item
      const isInListItem =
        _node &&
        typeof _node === "object" &&
        "parent" in _node &&
        _node.parent &&
        typeof _node.parent === "object" &&
        "type" in _node.parent &&
        _node.parent.type === "listItem";

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
        {finalProcessedContent}
      </ReactMarkdown>
    </div>
  );
}
