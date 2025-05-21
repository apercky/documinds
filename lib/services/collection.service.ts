"use server";

import { prisma } from "@/lib/prisma";
import {
  CreateCollectionSchema,
  GetCollectionRequest,
  GetCollectionSchema,
} from "@/lib/schemas/collection.schema";
import { qdrantClient, type Schemas, VECTOR_SIZE } from "@/lib/vs/qdrant";

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

export async function getCollections(input: GetCollectionRequest = {}) {
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

export async function getCollectionById(id: string) {
  return prisma.collection.findUnique({
    where: { id },
    include: {
      attributes: true,
    },
  });
}
