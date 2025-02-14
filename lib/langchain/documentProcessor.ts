"use server";

// utils/documentProcessor.ts
import { get_encoding } from "@dqbd/tiktoken";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import * as fs from "fs/promises";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import {
  RecursiveCharacterTextSplitter,
  TokenTextSplitter,
} from "langchain/text_splitter";
import path from "path";
import { VectorStoreManager } from "./vectorStore";

// Types for document processing
interface ProcessingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  metadata?: Record<string, unknown>;
  language?: string;
  encoding?: "cl100k_base" | "p50k_base" | "r50k_base";
  skipEmptyLines?: boolean;
  appendMetadata?: boolean;
}

interface ProcessingResult {
  documentCount: number;
  totalChunks: number;
  metadata: Record<string, unknown>;
  error?: string;
}

/**
 * Document Processor class to handle various document types and processing strategies
 */
class DocumentProcessor {
  private vectorStoreManager: VectorStoreManager;
  private readonly supportedExtensions = [
    ".pdf",
    ".docx",
    ".txt",
    ".csv",
    ".json",
  ];

  constructor(vectorStoreManager: VectorStoreManager) {
    this.vectorStoreManager = vectorStoreManager;
  }

  /**
   * Create appropriate text splitter based on options
   */
  private createTextSplitter(options: ProcessingOptions) {
    if (options.encoding) {
      // Use token-based splitting for more accurate chunks
      return new TokenTextSplitter({
        encodingName: options.encoding,
        chunkSize: options.chunkSize || 1000,
        chunkOverlap: options.chunkOverlap || 200,
      });
    }

    // Use character-based splitting
    return new RecursiveCharacterTextSplitter({
      chunkSize: options.chunkSize || 1000,
      chunkOverlap: options.chunkOverlap || 200,
      separators: this.getSeparatorsForLanguage(options.language),
    });
  }

  /**
   * Get appropriate separators based on language
   */
  private getSeparatorsForLanguage(language: string = "en"): string[] {
    const commonSeparators = ["\n\n", "\n", ". ", "! ", "? "];

    // Add language-specific separators
    switch (language.toLowerCase()) {
      case "zh":
        return ["。", "！", "？", "；", "\n\n", "\n", ...commonSeparators];
      case "ja":
        return ["。", "！", "？", "、", "\n\n", "\n", ...commonSeparators];
      case "ko":
        return [".", "!", "?", "\n\n", "\n", ...commonSeparators];
      default:
        return commonSeparators;
    }
  }

  /**
   * Get appropriate loader for file type
   */
  private async getLoader(filePath: string) {
    const extension = path.extname(filePath).toLowerCase();

    switch (extension) {
      case ".pdf":
        return new PDFLoader(filePath, {
          splitPages: true,
        });
      case ".docx":
        return new DocxLoader(filePath);
      case ".txt":
        return new TextLoader(filePath);
      case ".csv":
        return new CSVLoader(filePath);
      case ".json":
        return new JSONLoader(filePath);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  /**
   * Extract and process metadata from document
   */
  private async extractMetadata(
    filePath: string
  ): Promise<Record<string, unknown>> {
    const stats = await fs.stat(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    return {
      source: fileName,
      fileType: extension.slice(1),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      size: stats.size,
    };
  }

  /**
   * Process a single document
   */
  async processDocument(
    filePath: string,
    collectionName: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    try {
      // Validate file extension
      const extension = path.extname(filePath).toLowerCase();
      if (!this.supportedExtensions.includes(extension)) {
        throw new Error(`Unsupported file type: ${extension}`);
      }

      // Get document loader
      const loader = await this.getLoader(filePath);
      const docs = await loader.load();

      // Extract metadata
      const metadata = await this.extractMetadata(filePath);

      // Create text splitter
      const textSplitter = this.createTextSplitter(options);

      // Split documents
      const splitDocs = await textSplitter.splitDocuments(docs);

      // Add custom metadata if provided
      if (options.metadata || options.appendMetadata) {
        splitDocs.forEach((doc) => {
          doc.metadata = {
            ...doc.metadata,
            ...metadata,
            ...(options.metadata || {}),
          };
        });
      }

      // Store documents
      await this.vectorStoreManager.addDocuments(splitDocs, collectionName);

      return {
        documentCount: docs.length,
        totalChunks: splitDocs.length,
        metadata: metadata,
      };
    } catch (error) {
      console.error("Error processing document:", error);
      throw error;
    }
  }

  /**
   * Process multiple documents
   */
  async processDocuments(
    filePaths: string[],
    collectionName: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.processDocument(
          filePath,
          collectionName,
          options
        );
        results.push(result);
      } catch (error) {
        results.push({
          documentCount: 0,
          totalChunks: 0,
          metadata: {},
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Process documents from a directory
   */
  async processDirectory(
    dirPath: string,
    collectionName: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult[]> {
    try {
      const files = await fs.readdir(dirPath);
      const supportedFiles = files.filter((file) =>
        this.supportedExtensions.includes(path.extname(file).toLowerCase())
      );

      const filePaths = supportedFiles.map((file) => path.join(dirPath, file));
      return await this.processDocuments(filePaths, collectionName, options);
    } catch (error) {
      console.error("Error processing directory:", error);
      throw error;
    }
  }

  /**
   * Calculate token count for text
   */
  calculateTokens(text: string): number {
    const encoding = get_encoding("cl100k_base");
    return encoding.encode(text).length;
  }

  /**
   * Validate document before processing
   */
  async validateDocument(filePath: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check if file exists
      await fs.access(filePath);

      // Check file size
      const stats = await fs.stat(filePath);
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (stats.size > maxSize) {
        issues.push("File size exceeds 10MB limit");
      }

      // Check file extension
      const extension = path.extname(filePath).toLowerCase();
      if (!this.supportedExtensions.includes(extension)) {
        issues.push(`Unsupported file type: ${extension}`);
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      console.warn(error);
      issues.push("File not accessible");
      return {
        valid: false,
        issues,
      };
    }
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessor(
  new VectorStoreManager()
);

// Example usage:
/*
// Process a single document
const result = await documentProcessor.processDocument(
  "path/to/document.pdf",
  "my-collection",
  {
    chunkSize: 1000,
    chunkOverlap: 200,
    metadata: { source: "company-docs" },
    language: "en",
    encoding: "cl100k_base"
  }
);

// Process multiple documents
const results = await documentProcessor.processDocuments(
  ["doc1.pdf", "doc2.docx"],
  "my-collection"
);

// Process entire directory
const dirResults = await documentProcessor.processDirectory(
  "path/to/docs",
  "my-collection"
);

// Validate document
const validation = await documentProcessor.validateDocument("path/to/doc.pdf");
*/
