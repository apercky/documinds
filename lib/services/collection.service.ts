"use server";

import { prisma } from "@/lib/prisma";
import {
  CreateCollectionSchema,
  GetCollectionRequest,
  GetCollectionSchema,
} from "@/lib/schemas/collection.schema";
import {
  qdrantClient,
  VECTOR_SIZE,
  vectorStore,
  type Schemas,
} from "@/lib/vs/qdrant";
import { Collection, type AttributeType } from "@prisma/client";
import { collectionExists } from "../vs/qdrant/client";

export async function createCollection(input: any) {
  // Validate input with schema
  const data = CreateCollectionSchema.parse(input);
  console.log(data);

  // Check if collection already exists in database
  const existingCollection = await prisma.collection.findUnique({
    where: { name: data.name },
  });

  if (existingCollection) {
    throw new Error("COLLECTION_EXISTS_IN_DATABASE");
  }

  // Check if collection exists in Qdrant
  const qdrantExists = await collectionExists(data.name);
  console.log(`Collection ${data.name} exists in Qdrant:`, qdrantExists);

  // Map distance to Qdrant distance type
  let distanceValue: Schemas["Distance"] = "Cosine";

  // Persist on Postgres in transaction
  return prisma.$transaction(async (tx) => {
    let shouldCreateQdrantCollection = true;

    // If collection exists in Qdrant, we'll connect to it instead of creating
    if (qdrantExists) {
      shouldCreateQdrantCollection = false;
    } else {
      // Try to create the collection on Qdrant
      try {
        await qdrantClient.createCollection(data.name, {
          vectors: {
            size: VECTOR_SIZE,
            distance: distanceValue,
          },
        });
      } catch (error: any) {
        // Handle conflict error (409) - collection already exists
        if (error?.status === 409 || error?.message?.includes("Conflict")) {
          console.log(
            `Collection ${data.name} already exists in Qdrant, connecting to existing collection`
          );
          shouldCreateQdrantCollection = false;
        } else {
          throw error;
        }
      }
    }

    // 2 – Persist on Postgres
    const collection = await tx.collection.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });

    // 3 – Persist Attributes on Postgres
    await tx.attribute.createMany({
      data: data.attributes.map((a) => ({
        collectionId: collection.id,
        type: a.type,
        value: a.value,
      })),
    });

    return {
      ...collection,
      connectedToExisting: !shouldCreateQdrantCollection,
    };
  });
}

/**
 * Update a collection's attributes
 */
export async function updateCollectionAttributes(
  collectionId: string,
  attributes: { type: AttributeType; value: string | null }[]
) {
  // Check if collection exists
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { attributes: true },
  });

  if (!collection) {
    throw new Error("Collection not found");
  }

  // Update attributes in a transaction
  return prisma.$transaction(async (tx) => {
    // Get existing attributes to determine which ones to update and which to create
    const existingAttributes = collection.attributes;

    // Process each attribute in the update request
    for (const attr of attributes) {
      const existingAttr = existingAttributes.find((a) => a.type === attr.type);

      if (existingAttr) {
        // Update existing attribute
        await tx.attribute.update({
          where: { id: existingAttr.id },
          data: { value: attr.value },
        });
      } else {
        // Create new attribute
        await tx.attribute.create({
          data: {
            collectionId,
            type: attr.type,
            value: attr.value,
          },
        });
      }
    }

    // Get the updated collection with attributes
    return tx.collection.findUnique({
      where: { id: collectionId },
      include: { attributes: true },
    });
  });
}

export async function deleteCollection(name: string) {
  // Find the collection first to get its name
  const collection = await prisma.collection.findUnique({
    where: { name },
  });

  if (!collection) {
    throw new Error("Collection not found");
  }

  // Delete in transaction to maintain consistency
  return prisma.$transaction(async (tx) => {
    // 1. Delete all attributes
    await tx.attribute.deleteMany({
      where: {
        collectionId: collection.id,
      },
    });

    // 2. Delete the collection from Postgres
    await tx.collection.delete({
      where: {
        id: collection.id,
      },
    });

    // 3. Delete the collection from Qdrant if it exists
    try {
      const qdrantExists = await qdrantClient.collectionExists(collection.name);
      if (qdrantExists) {
        await qdrantClient.deleteCollection(collection.name);
      }
    } catch (error) {
      console.error("Error deleting Qdrant collection:", error);
      // We still continue even if there's an error with Qdrant
      // since we've already deleted from the database
    }

    return { success: true, message: "Collection deleted successfully" };
  });
}

/**
 * Helper function to get document count from Qdrant when needed
 */
async function getDocumentCountFromQdrant(
  collectionName: string
): Promise<number> {
  try {
    const stats = await vectorStore.getCollectionStats(collectionName);
    return stats.documentCount;
  } catch (error) {
    console.error(
      `Error getting document count from Qdrant for collection ${collectionName}:`,
      error
    );
    return 0;
  }
}

/**
 * Helper function to enrich collection with document count from Qdrant if needed
 */
async function enrichCollectionWithDocumentCount(
  collection: any
): Promise<any> {
  if (!collection.documentCount || collection.documentCount === 0) {
    const qdrantDocumentCount = await getDocumentCountFromQdrant(
      collection.name
    );
    return {
      ...collection,
      documentCount: qdrantDocumentCount,
    };
  }
  return collection;
}

export async function getCollections(
  input: GetCollectionRequest = {}
): Promise<Collection[]> {
  const data = GetCollectionSchema.parse(input);

  const collections = await prisma.collection.findMany({
    where: {
      ...(data.id && { id: data.id }),
      ...(data.name && { name: data.name }),
      ...(data.attributeFilters &&
        data.attributeFilters.length > 0 && {
          attributes: {
            some: {
              OR: data.attributeFilters.map((filter) => ({
                ...(filter.type && { type: filter.type }),
              })),
            },
          },
        }),
    },
    include: {
      attributes: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Enrich collections with document count from Qdrant when needed
  const enrichedCollections = await Promise.all(
    collections.map(enrichCollectionWithDocumentCount)
  );

  return enrichedCollections;
}

export async function getCollectionById(
  id: string
): Promise<Collection | null> {
  const collection = await prisma.collection.findUniqueOrThrow({
    where: { id },
    include: {
      attributes: true,
    },
  });

  // Enrich collection with document count from Qdrant when needed
  return await enrichCollectionWithDocumentCount(collection);
}

/**
 * Connect to an existing Qdrant collection and save it in the database
 */
export async function connectToExistingCollection(input: any) {
  // Validate input with schema
  const data = CreateCollectionSchema.parse(input);

  // Check if collection already exists in database
  const existingCollection = await prisma.collection.findUnique({
    where: { name: data.name },
  });

  if (existingCollection) {
    throw new Error("COLLECTION_EXISTS_IN_DATABASE");
  }

  // Check if collection exists in Qdrant
  const qdrantExists = await qdrantClient.collectionExists(data.name);

  if (!qdrantExists) {
    throw new Error("COLLECTION_NOT_FOUND_IN_QDRANT");
  }

  // Persist on Postgres in transaction
  return prisma.$transaction(async (tx) => {
    // Persist on Postgres
    const collection = await tx.collection.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });

    // Persist Attributes on Postgres
    await tx.attribute.createMany({
      data: data.attributes.map((a) => ({
        collectionId: collection.id,
        type: a.type,
        value: a.value,
      })),
    });

    // Get document count from Qdrant for the connected collection
    const documentCount = await getDocumentCountFromQdrant(data.name);

    return {
      ...collection,
      documentCount,
      connectedToExisting: true,
    };
  });
}

/**
 * Update a collection's description
 */
export async function updateCollectionDescription(
  collectionId: string,
  description: string
) {
  // Check if collection exists
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw new Error("Collection not found");
  }

  // Update the collection description
  return prisma.collection.update({
    where: { id: collectionId },
    data: { description },
    include: { attributes: true },
  });
}
