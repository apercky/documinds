import "server-only";

import { Collection } from "@/types/collection";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantClient, type Schemas } from "@qdrant/js-client-rest";
import crypto from "crypto";

// Latest model as of 2024
const OPENAI_EMBEDDING_MODEL_NAME = "text-embedding-3-large";

// Vector dimension for text-embedding-3-large model
const VECTOR_SIZE = 3072;

// Create OpenAI embeddings instance
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: OPENAI_EMBEDDING_MODEL_NAME,
  stripNewLines: true,
  maxConcurrency: 5,
  timeout: 10000,
});

// Create Qdrant client
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY || "",
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
   * Checks if a collection exists
   * @private
   */
  async _checkCollectionExists(collectionName: string): Promise<boolean> {
    try {
      const response = await qdrantClient.collectionExists(collectionName);
      const exists = response.exists;
      console.log("collectionExists:", exists ? "true" : "false");
      return exists;
    } catch (error) {
      console.error("Error checking if collection exists:", error);
      return false;
    }
  },

  /**
   * Creates or retrieves a collection with retry mechanism
   */
  async createOrGetCollection(config: {
    collectionName: string;
    metadata?: Record<string, unknown>;
    distance?: Schemas["Distance"];
  }): Promise<void> {
    const { collectionName, metadata = {}, distance = "cosine" } = config;

    try {
      // Check if collection exists using collection_exists endpoint
      const collectionExists = await this._checkCollectionExists(
        collectionName
      );

      if (!collectionExists) {
        // Map distance to Qdrant distance type
        let distanceValue: Schemas["Distance"] = "Cosine";

        try {
          // Create collection with properly typed vector config
          const collectionCreated = await qdrantClient.createCollection(
            collectionName,
            {
              vectors: {
                size: VECTOR_SIZE,
                distance: distanceValue,
              },
            }
          );

          // Store collection metadata as a special system point
          if (!collectionCreated) {
            console.error("Failed to create collection");
            throw new Error("Failed to create collection");
          }

          // After successful collection creation, add metadata
          if (Object.keys(metadata).length > 0) {
            try {
              const id = crypto.randomUUID();
              await qdrantClient.upsert(collectionName, {
                points: [
                  {
                    id,
                    vector: new Array(VECTOR_SIZE).fill(0),
                    payload: {
                      _is_system: true,
                      _collection_metadata: { ...metadata, id },
                    },
                  },
                ],
              });
              console.log("System metadata point created successfully");
            } catch (error) {
              console.error("Error creating system metadata point:", error);
              // We don't want to fail the whole operation if just the metadata upsert fails
            }
          }
        } catch (error) {
          console.error("Error creating collection:", error);
          throw error;
        }
      }

      return; // Explicit return to satisfy TypeScript return type
    } catch (error) {
      console.warn(error);
      throw error;
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
    // Get collection metadata to merge with document metadata
    const collectionMetadata = await this._getCollectionMetadata(
      collectionName
    );

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

      // Generate IDs for each document
      const ids = batch.map((doc) => doc.metadata?.id || crypto.randomUUID());

      // Get embeddings for the batch
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

      // Add documents to Qdrant
      const pointsToUpsert: Schemas["PointStruct"][] = batch.map((doc, idx) => {
        return {
          id: ids[idx],
          vector: embeddingResults[idx][0],
          payload: {
            page_content: doc.pageContent,
            metadata: doc.metadata || {},
            _collection_metadata: collectionMetadata,
          },
        };
      });

      await qdrantClient.upsert(collectionName, {
        points: pointsToUpsert,
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
    // Convert the vector query to embeddings
    const queryEmbedding = await embeddings.embedQuery(query);

    // Prepare filter if provided
    let qdrantFilter: Schemas["Filter"] | undefined;
    if (filter) {
      qdrantFilter = {
        must: Object.entries(filter).map(([key, value]) => ({
          key: `metadata.${key}`,
          match: { value },
        })),
      };
    }

    // Add filter to exclude system points
    const finalFilter: Schemas["Filter"] = {
      must: [
        ...(Array.isArray(qdrantFilter?.must) ? qdrantFilter.must : []),
        {
          must_not: [
            {
              key: "_is_system",
              match: { value: true },
            },
          ],
        },
      ],
    };

    // Search using the Qdrant client directly
    const searchRequest: Schemas["SearchRequest"] = {
      vector: queryEmbedding,
      limit: k,
      filter: finalFilter,
    };

    const searchResults = await qdrantClient.search(
      collectionName,
      searchRequest
    );

    // Convert to expected format
    return searchResults.map((result: Schemas["ScoredPoint"]) => {
      return new Document({
        pageContent: result.payload?.page_content as string,
        metadata: {
          ...(result.payload?.metadata || {}),
          _id: result.id,
          _collection_name: collectionName,
        },
      });
    });
  },

  /**
   * Gets collection metadata
   */
  async _getCollectionMetadata(
    collectionName: string
  ): Promise<Record<string, unknown>> {
    try {
      // Try to retrieve the system metadata point
      const searchRequest: Schemas["SearchRequest"] = {
        filter: {
          must: [
            {
              key: "_is_system",
              match: { value: true },
            },
          ],
        },
        limit: 1,
        vector: new Array(VECTOR_SIZE).fill(0), // Query with zero vector
      };

      const systemPoints = await qdrantClient.search(
        collectionName,
        searchRequest
      );

      if (
        systemPoints.length > 0 &&
        systemPoints[0].payload?._collection_metadata
      ) {
        return systemPoints[0].payload._collection_metadata as Record<
          string,
          unknown
        >;
      }

      return {} as Record<string, unknown>;
    } catch (error) {
      console.warn("Failed to retrieve collection metadata:", error);
      return {} as Record<string, unknown>;
    }
  },

  /**
   * Deletes a collection and all its documents
   */
  async deleteCollection(collectionName: string): Promise<{
    deletedCount: number;
  }> {
    try {
      // Check if collection exists
      const collectionExists = await this._checkCollectionExists(
        collectionName
      );

      if (!collectionExists) {
        return { deletedCount: 0 };
      }

      // Get collection info to determine size
      const collectionInfo: Schemas["CollectionInfo"] =
        await qdrantClient.getCollection(collectionName);
      const pointsCount = collectionInfo.points_count || 0;

      // Delete the collection
      await qdrantClient.deleteCollection(collectionName);

      return {
        deletedCount: pointsCount,
      };
    } catch (error) {
      console.error("Error deleting collection:", error);
      return { deletedCount: 0 };
    }
  },

  /**
   * Counts documents in a collection that match a filter
   * @private
   */
  async _countDocuments(
    collectionName: string,
    filter: Schemas["Filter"]
  ): Promise<number> {
    try {
      const response = await qdrantClient.count(collectionName, {
        filter,
        exact: true,
      });

      return response.count;
    } catch (error) {
      console.error("Error counting documents:", error);
      return 0;
    }
  },

  /**
   * Deletes documents from a collection
   */
  async deleteCollectionDocuments(
    collectionName: string,
    filter?: Record<string, unknown>
  ): Promise<{
    deletedCount: number;
  }> {
    try {
      // Check if collection exists
      const collectionExists = await this._checkCollectionExists(
        collectionName
      );

      if (!collectionExists) {
        return { deletedCount: 0 };
      }

      // Prepare a filter that excludes system metadata points
      let deleteFilter: Schemas["Filter"];

      if (filter && Object.keys(filter).length > 0) {
        // If a filter is provided, use it and exclude system points
        deleteFilter = {
          must: [
            ...Object.entries(filter).map(([key, value]) => ({
              key: `metadata.${key}`,
              match: { value },
            })),
            {
              must_not: [
                {
                  key: "_is_system",
                  match: { value: true },
                },
              ],
            },
          ],
        };
      } else {
        // If no filter is provided, delete all non-system points
        deleteFilter = {
          must_not: [
            {
              key: "_is_system",
              match: { value: true },
            },
          ],
        };
      }

      // Count the points that will be deleted using our batch scroll method
      const pointsCount = await this._countDocuments(
        collectionName,
        deleteFilter
      );

      if (pointsCount === 0) {
        return { deletedCount: 0 };
      }

      // Delete points that match the filter
      await qdrantClient.delete(collectionName, {
        filter: deleteFilter,
      });

      return {
        deletedCount: pointsCount,
      };
    } catch (error) {
      console.error("Error deleting documents from collection:", error);
      return { deletedCount: 0 };
    }
  },

  /**
   * Gets collection statistics
   */
  async getCollectionStats(collectionName: string): Promise<{
    documentCount: number;
    metadata: Record<string, unknown>;
  }> {
    try {
      const collectionInfo: Schemas["CollectionInfo"] =
        await qdrantClient.getCollection(collectionName);

      // Get system metadata
      const metadata = await this._getCollectionMetadata(collectionName);

      // Get all non-system points count
      const systemPointsCount = Object.keys(metadata).length > 0 ? 1 : 0;
      const documentCount =
        (collectionInfo.points_count || 0) - systemPointsCount;

      return {
        documentCount,
        metadata,
      };
    } catch (error) {
      console.error("Error getting collection stats:", error);
      return {
        documentCount: 0,
        metadata: {},
      };
    }
  },

  /**
   * Gets all collections ordered by name
   */
  async getCollections(): Promise<Collection[]> {
    try {
      const collectionsResponse = await qdrantClient.getCollections();

      // Get info for each collection
      const collectionsWithInfo = await Promise.all(
        collectionsResponse.collections.map(async (col: any) => {
          const collectionInfo: Schemas["CollectionInfo"] =
            await qdrantClient.getCollection(col.name);

          // Get collection metadata from system point
          const metadata = await this._getCollectionMetadata(col.name);

          // Adjust count for system point
          const systemPointsCount = Object.keys(metadata).length > 0 ? 1 : 0;
          const documentCount =
            (collectionInfo.points_count || 0) - systemPointsCount;

          return {
            name: col.name,
            documentCount,
            metadata,
          };
        })
      );

      // Sort by name
      return collectionsWithInfo.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error getting collections:", error);
      return [];
    }
  },

  /**
   * Deletes documents from a collection based on metadata criteria
   */
  async deleteDocumentsByMetadata(
    collectionName: string,
    metadata: Record<string, unknown>
  ): Promise<{ deletedCount: number }> {
    try {
      // Check if collection exists
      const collectionExists = await this._checkCollectionExists(
        collectionName
      );

      if (!collectionExists) {
        return { deletedCount: 0 };
      }

      // Transform the metadata to Qdrant filter format
      const filter: Schemas["Filter"] = {
        must: [
          ...Object.entries(metadata).map(([key, value]) => ({
            key: `metadata.${key}`,
            match: { value },
          })),
          {
            must_not: [
              {
                key: "_is_system",
                match: { value: true },
              },
            ],
          },
        ],
      };

      // Count the points that will be deleted using our batch scroll method
      const pointsCount = await this._countDocuments(collectionName, filter);

      if (pointsCount === 0) {
        return { deletedCount: 0 };
      }

      // Delete points that match the filter
      await qdrantClient.delete(collectionName, {
        filter: filter,
      });

      return { deletedCount: pointsCount };
    } catch (error) {
      console.error("Error deleting documents by metadata:", error);
      throw error;
    }
  },

  /**
   * Updates a collection's metadata
   */
  async updateCollectionMetadata(
    collectionName: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      // Check if collection exists
      const collectionExists = await this._checkCollectionExists(
        collectionName
      );

      if (!collectionExists) {
        throw new Error(`Collection ${collectionName} does not exist`);
      }

      // Get current metadata
      const currentMetadata = await this._getCollectionMetadata(collectionName);

      // If there's no id in metadata, we can't update anything
      if (!currentMetadata.id) {
        console.warn("No metadata ID found, nothing to update");
        return;
      }

      // Create updated metadata by only changing the requested fields
      const mergedMetadata = {
        ...currentMetadata,
        ...metadata,
      };

      // Find all points with this metadata ID
      const filter: Schemas["Filter"] = {
        must: [
          {
            key: "_collection_metadata.id",
            match: { value: currentMetadata.id },
          },
        ],
      };

      // Use Qdrant's native setPayload operation to update ONLY the _collection_metadata field
      await qdrantClient.setPayload(collectionName, {
        payload: {
          _collection_metadata: mergedMetadata,
        },
        filter,
      });

      console.log(
        `Updated collection metadata for points with ID ${currentMetadata.id}`
      );
    } catch (error) {
      console.error("Error updating collection metadata:", error);
      throw error;
    }
  },
};
