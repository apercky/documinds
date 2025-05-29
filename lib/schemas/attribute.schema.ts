import { AttributeType } from "@prisma/client";
import { z } from "zod";

export const FindAttributesSchema = z.object({
  collectionId: z.string().optional(),
  type: z.nativeEnum(AttributeType).optional(),
});

export type FindAttributesRequest = z.infer<typeof FindAttributesSchema>;

// Export attribute types for use in client components
export const attributeTypeValues = Object.values(AttributeType);
