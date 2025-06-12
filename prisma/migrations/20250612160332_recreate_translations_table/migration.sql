-- CreateTable
CREATE TABLE "dm_translations" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT 'common',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dm_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dm_translations_key_locale_namespace_key" ON "dm_translations"("key", "locale", "namespace");

-- CreateIndex
CREATE INDEX "dm_translations_locale_namespace_idx" ON "dm_translations"("locale", "namespace"); 