import { AttributeType } from "@/lib/prisma/generated";
import { z } from "zod";

export const CreateCollectionSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Collection name must be at least 3 characters long" })
    .max(50, { message: "Collection name cannot exceed 50 characters" })
    .refine((val) => val.trim().length > 0, {
      message: "Collection name is required",
    }),
  description: z.string().optional(),
  attributes: z.array(
    z.object({
      type: z.nativeEnum(AttributeType),
      value: z.string().optional(),
    })
  ),
});

export type CreateCollectionRequest = z.infer<typeof CreateCollectionSchema>;

export const GetCollectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  attributeFilters: z
    .array(
      z.object({
        type: z.nativeEnum(AttributeType).optional(),
        value: z.string().optional(),
      })
    )
    .optional(),
});

export type GetCollectionRequest = z.infer<typeof GetCollectionSchema>;
