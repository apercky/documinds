"use server";

import { prisma } from "@/lib/prisma";
import { Collection, type AttributeType } from "@/lib/prisma/generated";
import {
  CreateCollectionSchema,
  GetCollectionRequest,
  GetCollectionSchema,
} from "@/lib/schemas/collection.schema";
import { qdrantClient, VECTOR_SIZE, type Schemas } from "@/lib/vs/qdrant";

export async function createCollection(input: any) {
  // Validate input with schema
  const data = CreateCollectionSchema.parse(input);
  console.log(data);

  // 2 – controlla se la collezione esiste su Qdrant
  const exists = await qdrantClient.collectionExists(data.name);
  if (exists) {
    console.log(exists);
    //throw new Error("Qdrant collection already exists");
  }

  // Map distance to Qdrant distance type
  let distanceValue: Schemas["Distance"] = "Cosine";

  // Persist on Postgres in transaction
  return prisma.$transaction(async (tx) => {
    // 1 – Create the collection on Qdrant
    await qdrantClient.createCollection(data.name, {
      vectors: {
        size: VECTOR_SIZE,
        distance: distanceValue,
      },
    });

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

    return collection;
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

export async function getCollections(
  input: GetCollectionRequest = {}
): Promise<Collection[]> {
  const data = GetCollectionSchema.parse(input);

  return prisma.collection.findMany({
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
  });
}

export async function getCollectionById(
  id: string
): Promise<Collection | null> {
  return prisma.collection.findUniqueOrThrow({
    where: { id },
    include: {
      attributes: true,
    },
  });
}
