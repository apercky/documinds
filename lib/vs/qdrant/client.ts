import "server-only";

import { QdrantClient, Schemas } from "@qdrant/js-client-rest";

// Create Qdrant client
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_API_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY || "",
});

/**
 * Checks if a collection exists
 * @param collectionName - The name of the collection to check
 * @returns `true` if the collection exists, `false` otherwise
 */
export async function collectionExists(
  collectionName: string
): Promise<boolean> {
  try {
    const response = await qdrantClient.collectionExists(collectionName);
    const exists = response.exists;
    console.log("collectionExists:", exists ? "true" : "false");
    return exists;
  } catch (error) {
    console.error("Error checking if collection exists:", error);
    return false;
  }
}

export type { Schemas };

export default qdrantClient;
