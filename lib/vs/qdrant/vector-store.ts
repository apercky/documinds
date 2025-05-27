import "server-only";

import qdrantClient, { Schemas } from "./client";

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
          ],
        };
      } else {
        // If no filter is provided, delete all non-system points
        deleteFilter = {
          must_not: [],
        };
      }

      // Count the points that will be deleted
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
  }> {
    try {
      const collectionInfo: Schemas["CollectionInfo"] =
        await qdrantClient.getCollection(collectionName);

      // Get all points count
      const documentCount = collectionInfo.points_count || 0;

      return {
        documentCount,
      };
    } catch (error) {
      console.error("Error getting collection stats:", error);
      return {
        documentCount: 0,
      };
    }
  },

  /**
   * Checks if a collection exists
   * @private
   */
  async _checkCollectionExists(collectionName: string): Promise<boolean> {
    try {
      const response = await qdrantClient.collectionExists(collectionName);
      const exists = response.exists;
      return exists;
    } catch (error) {
      console.error("Error checking if collection exists:", error);
      return false;
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
};
