/*
  Warnings:

  - You are about to drop the column `qdrant_name` on the `dm_collections` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `dm_collections` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "dm_collections_qdrant_name_key";

-- AlterTable
ALTER TABLE "dm_collections" DROP COLUMN "qdrant_name";

-- CreateIndex
CREATE UNIQUE INDEX "dm_collections_name_key" ON "dm_collections"("name");
