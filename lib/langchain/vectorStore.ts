import "server-only";

// utils/vectorStore.ts
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";
import { VectorStore } from "@langchain/core/vectorstores";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChromaClient } from "chromadb";

// Latest model as of 2024
const OPENAI_EMBEDDING_MODEL_NAME = "text-embedding-3-small";

// Create OpenAI embeddings instance
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: OPENAI_EMBEDDING_MODEL_NAME,
  stripNewLines: true,
  maxConcurrency: 5,
  timeout: 10000,
});

// Create ChromaDB client
const client = new ChromaClient();

// Vector store manager functions
export const vectorStore = {
  /**
   * Creates or retrieves a collection with retry mechanism
   */
  async createOrGetCollection(config: {
    collectionName: string;
    metadata?: Record<string, unknown>;
    distance?: "cosine" | "l2" | "ip";
  }): Promise<VectorStore> {
    const { collectionName, metadata = {}, distance = "cosine" } = config;

    try {
      return await Chroma.fromExistingCollection(embeddings, {
        collectionName,
        collectionMetadata: {
          "hnsw:space": distance,
          ...metadata,
        },
      });
    } catch (error) {
      console.warn(error);
      return await Chroma.fromDocuments([], embeddings, {
        collectionName,
        collectionMetadata: {
          "hnsw:space": distance,
          ...metadata,
        },
      });
    }
  },

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
  },

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
  },

  /**
   * Deletes a collection and all its documents
   */
  async deleteCollection(collectionName: string): Promise<void> {
    await client.deleteCollection({ name: collectionName });
  },

  /**
   * Gets collection statistics
   */
  async getCollectionStats(collectionName: string): Promise<{
    documentCount: number;
    metadata: Record<string, unknown>;
  }> {
    const collection = await client.getCollection({
      name: collectionName,
      embeddingFunction: {
        generate: (texts: string[]) => embeddings.embedDocuments(texts),
      },
    });
    const count = await collection.count();
    const metadata = collection.metadata || {};

    return {
      documentCount: count,
      metadata,
    };
  },

  /**
   * Gets all collections ordered by name
   */
  async getCollections(): Promise<{ name: string; documentCount: number }[]> {
    const collections = await client.listCollections();

    // Get count for each collection
    const collectionsWithCount = await Promise.all(
      collections.map(async (col) => {
        const collection = await client.getCollection({
          name: col,
          embeddingFunction: {
            generate: (texts: string[]) => embeddings.embedDocuments(texts),
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
  },
};

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
