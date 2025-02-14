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

export class DocumentProcessor {
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });
  }

  async splitDocuments(documents: ProcessedDocument[]): Promise<Document[]> {
    const docs = documents.map(
      (doc) =>
        new Document({
          pageContent: doc.content,
          metadata: doc.metadata,
        })
    );

    return await this.textSplitter.splitDocuments(docs);
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessor();
