import { Collection as PrismaCollection } from "@prisma/client";

export interface Collection extends PrismaCollection {
  metadata?: Record<string, unknown>;
}
