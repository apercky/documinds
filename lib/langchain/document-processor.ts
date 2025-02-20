import "server-only";

import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createWorker, PSM } from "tesseract.js";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export interface ProcessedDocument {
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

  async processUnstructuredDocs(docs: Document[]): Promise<Document[]> {
    const worker = await createWorker(["ita", "eng"]);

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO, // Modalità layout auto
      preserve_interword_spaces: "1",
      textord_tabfind_show_blocks: "1",
    });

    const processedDocs = docs.map(async (doc) => {
      let combinedText = doc.pageContent || "";

      if (doc.metadata && doc.metadata.type) {
        // Convert type to lowercase for consistency.
        const typeLower = doc.metadata.type.toLowerCase();

        if (typeLower === "image" && doc.metadata.image_base64) {
          // You might choose to run OCR or captioning on the image.
          // Here, we simply add a placeholder.

          const result = await worker.recognize(doc.metadata.image_base64, {
            pdfTitle: "Documento Processato",
            pdfText: true,
          });
          combinedText += "\n[Image Content]";
        }
        if (typeLower === "table") {
          // If available, include the table's HTML (or any other representation).
          if (doc.metadata.table_html) {
            combinedText += `\n[Table Content]: ${doc.metadata.table_html}`;
          } else {
            combinedText += "\n[Table Content]";
          }
        }
      }

      // Return a new Document that combines all the extracted content.
      return new Document({
        pageContent: combinedText,
        metadata: doc.metadata,
      });
    });
    return await textSplitter.splitDocuments(processedDocs);
  },
};
