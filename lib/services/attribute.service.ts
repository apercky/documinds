"use server";

import { prisma } from "@/lib/prisma";
import {
  FindAttributesRequest,
  FindAttributesSchema,
} from "@/lib/schemas/attribute.schema";

export async function findAttributes(input: FindAttributesRequest = {}) {
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
