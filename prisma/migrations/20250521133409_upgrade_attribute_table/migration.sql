/*
  Warnings:

  - You are about to drop the column `display_key` on the `dm_collection_attributes` table. All the data in the column will be lost.
  - You are about to drop the column `display_name` on the `dm_collection_attributes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "dm_collection_attributes" DROP COLUMN "display_key",
DROP COLUMN "display_name";
