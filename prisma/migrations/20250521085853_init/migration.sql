-- CreateEnum
CREATE TYPE "dm_attribute_type" AS ENUM ('BRAND', 'CATEGORY', 'DISPLAY_NAME', 'DISPLAY_KEY');

-- CreateTable
CREATE TABLE "dm_collections" (
    "id" TEXT NOT NULL,
    "qdrant_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dm_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_collection_attributes" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "type" "dm_attribute_type" NOT NULL,
    "display_key" TEXT,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dm_collection_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_translations" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dm_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dm_collections_qdrant_name_key" ON "dm_collections"("qdrant_name");

-- CreateIndex
CREATE INDEX "dm_collection_attributes_collection_id_idx" ON "dm_collection_attributes"("collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "dm_translations_locale_namespace_key_key" ON "dm_translations"("locale", "namespace", "key");

-- AddForeignKey
ALTER TABLE "dm_collection_attributes" ADD CONSTRAINT "dm_collection_attributes_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "dm_collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
