"use server";

// utils/vectorStore.ts
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";
import { Embeddings } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChromaClient } from "chromadb";

// Latest model as of 2024
const OPENAI_EMBEDDING_MODEL_NAME = "text-embedding-3-small";

// Types for better type safety
interface ChromaConfig {
  url: string;
  auth: {
    provider: "basic";
    credentials: {
      username: string;
      password: string;
    };
  };
}

interface CollectionConfig {
  collectionName: string;
  metadata?: Record<string, unknown>;
  distance?: "cosine" | "l2" | "ip";
}

/**
 * Default configuration for the ChromaDB client
 */
const DEFAULT_CONFIG: ChromaConfig = {
  url: process.env.CHROMA_URL || "http://localhost:8000",
  auth: {
    provider: "basic",
    credentials: {
      username: process.env.CHROMA_USER || "your_username",
      password: process.env.CHROMA_PASSWORD || "your_strong_password",
    },
  },
};

/**
 * Singleton class to manage ChromaDB client instance
 */
class ChromaClientManager {
  private static instance: ChromaClient;
  public static config: ChromaConfig = DEFAULT_CONFIG;

  public static getInstance(): ChromaClient {
    if (!ChromaClientManager.instance) {
      ChromaClientManager.instance = new ChromaClient({
        path: ChromaClientManager.config.url,
        auth: ChromaClientManager.config.auth,
      });
    }
    return ChromaClientManager.instance;
  }

  public static updateConfig(config: Partial<ChromaConfig>): void {
    ChromaClientManager.config = { ...ChromaClientManager.config, ...config };
    // Reset instance to apply new config
    ChromaClientManager.instance = new ChromaClient({
      path: ChromaClientManager.config.url,
      auth: ChromaClientManager.config.auth,
    });
  }
}

/**
 * OpenAI embeddings instance with configurable parameters
 */
export const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: OPENAI_EMBEDDING_MODEL_NAME,
  stripNewLines: true, // Remove unnecessary newlines
  maxConcurrency: 5, // Limit concurrent requests
  timeout: 10000, // 10 second timeout
});

/**
 * Class to manage vector store operations
 */
export class VectorStoreManager {
  private client: ChromaClient;
  private embeddings: Embeddings;

  constructor(embeddings: Embeddings = new OpenAIEmbeddings()) {
    this.client = ChromaClientManager.getInstance();
    this.embeddings = embeddings;
  }

  /**
   * Creates or retrieves a collection with retry mechanism
   */
  async createOrGetCollection(config: CollectionConfig): Promise<VectorStore> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.attemptCollectionCreation(config);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt + 1} failed:`, error);
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt))
        );
      }
    }

    throw new Error(
      `Failed to create/get collection after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Attempts to create or retrieve a collection
   */
  private async attemptCollectionCreation(
    config: CollectionConfig
  ): Promise<VectorStore> {
    const { collectionName, metadata = {}, distance = "cosine" } = config;

    try {
      // Try to get existing collection
      const vectorStore = await Chroma.fromExistingCollection(this.embeddings, {
        collectionName,
        url: ChromaClientManager.config.url,
        collectionMetadata: {
          "hnsw:space": distance,
          ...metadata,
        },
      });
      return vectorStore;
    } catch (error) {
      console.warn(error);
      // Use underscore to indicate intentionally unused parameter
      // If collection doesn't exist, create a new one
      return await Chroma.fromDocuments([], this.embeddings, {
        collectionName,
        url: ChromaClientManager.config.url,
        collectionMetadata: {
          "hnsw:space": distance,
          ...metadata,
        },
      });
    }
  }

  /**
   * Adds documents to a collection with batching
   */
  async addDocuments(
    documents: Document[],
    collectionName: string,
    batchSize: number = 100
  ): Promise<void> {
    const vectorStore = await this.createOrGetCollection({ collectionName });

    // Process documents in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await vectorStore.addDocuments(batch);
      console.log(
        `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          documents.length / batchSize
        )}`
      );
    }
  }

  /**
   * Performs a similarity search with metadata filtering
   */
  async similaritySearch(
    query: string,
    collectionName: string,
    k: number = 4,
    filter?: Record<string, unknown>
  ): Promise<Document[]> {
    const vectorStore = await this.createOrGetCollection({ collectionName });
    return await vectorStore.similaritySearch(query, k, filter);
  }

  /**
   * Deletes a collection and all its documents
   */
  async deleteCollection(collectionName: string): Promise<void> {
    await this.client.deleteCollection({ name: collectionName });
  }

  /**
   * Gets collection statistics
   */
  async getCollectionStats(collectionName: string): Promise<{
    documentCount: number;
    metadata: Record<string, unknown>;
  }> {
    const collection = await this.client.getCollection({
      name: collectionName,
      embeddingFunction: {
        generate: (texts: string[]) => this.embeddings.embedDocuments(texts),
      },
    });
    const count = await collection.count();
    const metadata = collection.metadata || {};

    return {
      documentCount: count,
      metadata: metadata,
    };
  }

  /**
   * Updates documents in a collection
   */
  async updateDocuments(
    documents: Document[],
    collectionName: string,
    ids: string[]
  ): Promise<void> {
    if (documents.length !== ids.length) {
      throw new Error("Number of documents must match number of IDs");
    }

    const vectorStore = await this.createOrGetCollection({ collectionName });

    // Delete existing documents
    await vectorStore.delete({ ids });

    // Add updated documents
    await vectorStore.addDocuments(documents);
  }

  /**
   * Gets all collections ordered by name
   */
  async getCollections(): Promise<{ name: string; documentCount: number }[]> {
    const collections = await this.client.listCollections();

    // Get count for each collection
    const collectionsWithCount = await Promise.all(
      collections.map(async (col) => {
        const collection = await this.client.getCollection({
          name: col,
          embeddingFunction: {
            generate: (texts: string[]) =>
              this.embeddings.embedDocuments(texts),
          },
        });
        const count = await collection.count();

        return {
          name: col,
          documentCount: count,
        };
      })
    );

    // Sort by name
    return collectionsWithCount.sort((a, b) => a.name.localeCompare(b.name));
  }
}

// Export singleton instance
export const vectorStoreManager = new VectorStoreManager(embeddings);

// Example usage:
/*
const manager = new VectorStoreManager();

// Create or get a collection
const collection = await manager.createOrGetCollection({
  collectionName: "my-docs",
  metadata: { source: "company-docs" },
  distance: "cosine"
});

// Add documents
await manager.addDocuments(documents, "my-docs");

// Search
const results = await manager.similaritySearch(
  "How do I reset my password?",
  "my-docs",
  4,
  { department: "IT" }
);

// Update ChromaDB configuration
ChromaClientManager.updateConfig({
  url: "https://chroma.example.com",
  ssl: true,
  auth: {
    provider: "basic",
    credentials: {
      username: process.env.CHROMA_USER,
      password: process.env.CHROMA_PASSWORD
    }
  }
});

// Add documents in batches
await manager.addDocuments(largeDocumentArray, "my-collection", 50);

// Get collection statistics
const stats = await manager.getCollectionStats("my-collection");

// Update documents
await manager.updateDocuments(
  updatedDocs,
  "my-collection",
  documentIds
);

// Delete collection
await manager.deleteCollection("my-collection");
*/
