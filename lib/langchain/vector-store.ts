import "server-only";

// utils/vectorStore.ts
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";
import { VectorStore } from "@langchain/core/vectorstores";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChromaClient } from "chromadb";

// Latest model as of 2024
const OPENAI_EMBEDDING_MODEL_NAME = "text-embedding-3-large";

// Create OpenAI embeddings instance
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: OPENAI_EMBEDDING_MODEL_NAME,
  batchSize: 512,
  stripNewLines: true,
  maxConcurrency: 5,
  timeout: 10000,
});

// const client = new Chroma(embeddings, {
//   url: process.env.CHROMA_URL || "http://localhost:8000",
//   clientParams: {
//     ...(process.env.NODE_ENV === "production" && {
//       auth: {
//         provider: "basic",
//         credentials: {
//           username: process.env.CHROMA_USER,
//           password: process.env.CHROMA_PASSWORD,
//         },
//       },
//     }),
//   },
// });

// Create ChromaDB client
const chromaClient = new ChromaClient({
  path: process.env.CHROMA_URL || "http://localhost:8000",
  ...(process.env.NODE_ENV === "production" && {
    auth: {
      provider: "basic",
      credentials: {
        username: process.env.CHROMA_USER,
        password: process.env.CHROMA_PASSWORD,
      },
    },
  }),
});

export interface ProcessProgress {
  currentDocument: number;
  totalDocuments: number;
  currentBatch: number;
  totalBatches: number;
  status: "preparing" | "embedding" | "storing";
  details: string;
}

export type ProgressCallback = (progress: ProcessProgress) => void;

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
   * Adds documents to a collection with batching and progress reporting
   */
  async addDocuments(
    documents: Document[],
    collectionName: string,
    batchSize: number = 5,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const vectorStore = await this.createOrGetCollection({ collectionName });
    const totalDocuments = documents.length;
    const totalBatches = Math.ceil(totalDocuments / batchSize);

    // Process documents in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;

      onProgress?.({
        currentDocument: i,
        totalDocuments,
        currentBatch,
        totalBatches,
        status: "preparing",
        details: `Preparing batch ${currentBatch}/${totalBatches}`,
      });

      // Prepare embeddings
      onProgress?.({
        currentDocument: i,
        totalDocuments,
        currentBatch,
        totalBatches,
        status: "embedding",
        details: `Embedding documents ${i + 1}-${Math.min(
          i + batch.length,
          totalDocuments
        )}/${totalDocuments}`,
      });

      const normalizedBatch = batch.map((doc) => ({
        ...doc,
        pageContent: doc.pageContent.toLowerCase(), // Normalize to lowercase
      }));

      const embedPromises = batch.map((doc) =>
        embeddings.embedDocuments([doc.pageContent])
      );
      const embeddingResults = await Promise.all(embedPromises);

      onProgress?.({
        currentDocument: i,
        totalDocuments,
        currentBatch,
        totalBatches,
        status: "storing",
        details: `Storing documents ${i + 1}-${Math.min(
          i + batch.length,
          totalDocuments
        )}/${totalDocuments}`,
      });

      await vectorStore.addDocuments(batch, {
        ids: batch.map((doc) => doc.metadata?.id || crypto.randomUUID()),
        documents: batch.map((doc) => doc.pageContent),
        metadatas: batch.map((doc) => doc.metadata),
        uris: batch.map((doc) => doc.metadata?.filename || ""),
        embeddings: embeddingResults.flat(),
      });

      onProgress?.({
        currentDocument: Math.min(i + batchSize, totalDocuments),
        totalDocuments,
        currentBatch,
        totalBatches,
        status: "storing",
        details: `Completed batch ${currentBatch}/${totalBatches}`,
      });
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
    await chromaClient.deleteCollection({ name: collectionName });
  },

  /**
   * Gets collection statistics
   */
  async getCollectionStats(collectionName: string): Promise<{
    documentCount: number;
    metadata: Record<string, unknown>;
  }> {
    const collection = await chromaClient.getCollection({
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
    const collections = await chromaClient.listCollections();

    // Get count for each collection
    const collectionsWithCount = await Promise.all(
      collections.map(async (col) => {
        const collection = await chromaClient.getCollection({
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

  /**
   * Deletes documents from a collection based on metadata criteria
   */
  async deleteDocumentsByMetadata(
    collectionName: string,
    metadata: Record<string, unknown>
  ): Promise<{ deletedCount: number }> {
    try {
      const collection = await chromaClient.getCollection({
        name: collectionName,
        embeddingFunction: {
          generate: (texts: string[]) => embeddings.embedDocuments(texts),
        },
      });

      // Get all documents that match the metadata criteria
      const queryResult = await collection.get({
        where: metadata,
      });

      if (!queryResult.ids.length) {
        return { deletedCount: 0 };
      }

      // Delete the matching documents
      await collection.delete({
        ids: queryResult.ids,
      });

      return { deletedCount: queryResult.ids.length };
    } catch (error) {
      console.error("Error deleting documents by metadata:", error);
      throw error;
    }
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
