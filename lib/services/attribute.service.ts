import { prisma } from "@/lib/prisma";
import { AttributeType } from "@/lib/prisma/generated";
import { z } from "zod";

export const FindAttributesSchema = z.object({
  collectionId: z.string().optional(),
  type: z.nativeEnum(AttributeType).optional(),
});

export type FindAttributesInput = z.infer<typeof FindAttributesSchema>;

export async function findAttributes(input: FindAttributesInput = {}) {
  const data = FindAttributesSchema.parse(input);

  return prisma.attribute.findMany({
    where: {
      ...(data.collectionId && { collectionId: data.collectionId }),
      ...(data.type && { type: data.type }),
    },
    include: {
      collection: true,
    },
  });
}

export async function findAttributeById(id: string) {
  return prisma.attribute.findUnique({
    where: { id },
    include: {
      collection: true,
    },
  });
}

export async function getAttributeTypes() {
  return Object.values(AttributeType);
}
