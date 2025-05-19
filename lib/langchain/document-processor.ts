import "server-only";

import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import Tesseract from "tesseract.js";

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

const extractTextFromImage = async (base64Image: string): Promise<string> => {
  const { data } = await Tesseract.recognize(base64Image, "it+eng");
  return data.text.trim();
};

// Export document processor functions
export const documentProcessor = {
  /**
   * Splits documents into smaller chunks for processing
   */
  async splitDocuments(documents: Document[]): Promise<Document[]> {
    return await textSplitter.splitDocuments(documents);
  },

  async processUnstructuredDocs(docs: Document[]): Promise<Document[]> {
    const processedDocs = docs.map(async (doc) => {
      let combinedText = doc.pageContent || "";

      console.log("doc", JSON.stringify(doc.metadata, null, 2));

      if (doc.metadata && doc.metadata.type) {
        // Convert type to lowercase for consistency.
        const typeLower = doc.metadata.type.toLowerCase();

        if (typeLower === "image" && doc.metadata.image_base64) {
          // You might choose to run OCR or captioning on the image.
          // Here, we simply add a placeholder.
          const ocrText = await extractTextFromImage(doc.metadata.image_base64);
          console.log("ocrText", ocrText);
          combinedText += `\n[Image Content]: ${ocrText}`;
        }
        if (typeLower === "table") {
          // If available, include the table's HTML (or any other representation).
          if (doc.metadata.table_html) {
            combinedText += `\n[Table Content]: ${doc.metadata.table_html}`;
            console.log("tableHtml", doc.metadata.table_html);
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

    const resolvedDocs = await Promise.all(processedDocs);
    return await textSplitter.splitDocuments(resolvedDocs);
  },
};
