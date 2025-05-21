import { prisma } from "@/lib/prisma";
import { AttributeType } from "@/lib/prisma/generated";
import { qdrantClient, type Schemas, VECTOR_SIZE } from "@/lib/vs/qdrant";
import { z } from "zod";

export const CreateCollectionSchema = z.object({
  qdrantName: z.string().min(3),
  name: z.string().min(1),
  description: z.string().optional(),
  attributes: z.array(
    z.object({
      type: z.nativeEnum(AttributeType),
      displayKey: z.string().optional(),
      displayName: z.string().optional(),
    })
  ),
});

export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;

export async function createCollection(input: CreateCollectionInput) {
  // 1 – validazione
  const data = CreateCollectionSchema.parse(input);

  // 2 – controlla se la collezione esiste su Qdrant
  const exists = await qdrantClient.collectionExists(data.qdrantName);
  if (exists) {
    throw new Error("Qdrant collection already exists");
  }

  // Map distance to Qdrant distance type
  let distanceValue: Schemas["Distance"] = "Cosine";

  // 2 – Create the collection on Qdrant
  await qdrantClient.createCollection(data.qdrantName, {
    vectors: {
      size: VECTOR_SIZE,
      distance: distanceValue,
    },
  });

  // 3 – Persist on Postgres in transaction
  return prisma.$transaction(async (tx) => {
    const collection = await tx.collection.create({
      data: {
        qdrantName: data.qdrantName,
        name: data.name,
        description: data.description,
      },
    });

    await tx.attribute.createMany({
      data: data.attributes.map((a) => ({
        collectionId: collection.id,
        type: a.type,
        displayKey: a.displayKey,
        displayName: a.displayName,
      })),
    });

    return collection;
  });
}
