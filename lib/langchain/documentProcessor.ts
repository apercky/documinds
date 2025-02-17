import "server-only";

import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;

interface ProcessedDocument {
  content: string;
  metadata: {
    source: string;
    type: string;
    size: number;
    [key: string]: unknown;
  };
}

// Create text splitter instance
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
  separators: ["\n\n", "\n", ". ", " ", ""],
});

// Export document processor functions
export const documentProcessor = {
  /**
   * Splits documents into smaller chunks for processing
   */
  async splitDocuments(documents: ProcessedDocument[]): Promise<Document[]> {
    const docs = documents.map(
      (doc) =>
        new Document({
          pageContent: doc.content,
          metadata: doc.metadata,
        })
    );

    return await textSplitter.splitDocuments(docs);
  },
};
