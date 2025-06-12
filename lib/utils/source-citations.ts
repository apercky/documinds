export interface SourceCitation {
  filename: string;
  page: number;
  totalPages: number;
  originalText: string;
}

/**
 * Parses source citations from text content
 * Handles both formats:
 * 1. [src name="filename" page="X" total_pages="Y"]
 * 2. CITATION_1, CITATION_2, etc. (for already processed citations)
 */
export function parseSourceCitations(text: string): {
  citations: SourceCitation[];
  textWithoutCitations: string;
} {
  const sourceRegex =
    /\[src name="([^"]+)" page="(\d+)" total_pages="(\d+)"\]/g;
  const citations: SourceCitation[] = [];
  let match;

  // Extract all citations
  while ((match = sourceRegex.exec(text)) !== null) {
    citations.push({
      filename: match[1],
      page: parseInt(match[2], 10),
      totalPages: parseInt(match[3], 10),
      originalText: match[0],
    });
  }

  // Remove citations from text
  const textWithoutCitations = text.replace(sourceRegex, "").trim();

  return {
    citations,
    textWithoutCitations,
  };
}

/**
 * Processes source citations in text with numbered references
 * Handles both original format and pre-processed CITATION_X format
 */
export function processSourceCitations(text: string): {
  processedText: string;
  citations: Map<number, SourceCitation>;
} {
  const citations = new Map<number, SourceCitation>();

  // Handle the [src name="..." format
  const sourceRegex =
    /\[src name="([^"]+)" page="(\d+)" total_pages="(\d+)"\]/g;
  let citationNumber = 1;

  let processedText = text.replace(
    sourceRegex,
    (match, filename, page, totalPages) => {
      const citation: SourceCitation = {
        filename,
        page: parseInt(page, 10),
        totalPages: parseInt(totalPages, 10),
        originalText: match,
      };

      citations.set(citationNumber, citation);
      const placeholder = `__CITATION_${citationNumber}__`;
      citationNumber++;

      return placeholder;
    }
  );

  // Also handle already processed CITATION_X format (fallback)
  const citationRegex = /\bCITATION_(\d+)\b/g;
  processedText = processedText.replace(citationRegex, (match, num) => {
    const citationNum = parseInt(num, 10);

    // Only create a citation if we don't already have one for this number
    if (!citations.has(citationNum)) {
      citations.set(citationNum, {
        filename: `Document ${citationNum}`,
        page: 1,
        totalPages: 1,
        originalText: match,
      });
    }

    return `__CITATION_${citationNum}__`;
  });

  // Debug logging
  console.log("Original text:", text);
  console.log("Processed text:", processedText);
  console.log("Citations found:", citations);

  return {
    processedText,
    citations,
  };
}
