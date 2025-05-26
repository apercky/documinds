-- CreateEnum
CREATE TYPE "dm_setting_key" AS ENUM ('OPENAI_API_KEY', 'LANGFLOW_API_KEY', 'LANGFLOW_FLOW_CHAT_ID', 'LANGFLOW_FLOW_EMBEDDINGS_ID');

-- CreateTable
CREATE TABLE "dm_companies" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dm_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_settings" (
    "id" SERIAL NOT NULL,
    "brand_code" TEXT NOT NULL,
    "setting_key" "dm_setting_key" NOT NULL,
    "encrypted_value" TEXT,
    "plain_value" TEXT,
    "is_encrypted" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "last_modified_by" TEXT NOT NULL,

    CONSTRAINT "dm_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dm_companies_code_key" ON "dm_companies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dm_companies_brand_code_key" ON "dm_companies"("brand_code");

-- CreateIndex
CREATE INDEX "dm_companies_brand_code_idx" ON "dm_companies"("brand_code");

-- CreateIndex
CREATE INDEX "dm_settings_brand_code_idx" ON "dm_settings"("brand_code");

-- CreateIndex
CREATE UNIQUE INDEX "dm_settings_brand_code_setting_key_key" ON "dm_settings"("brand_code", "setting_key");

-- AddForeignKey
ALTER TABLE "dm_settings" ADD CONSTRAINT "dm_settings_brand_code_fkey" FOREIGN KEY ("brand_code") REFERENCES "dm_companies"("brand_code") ON DELETE CASCADE ON UPDATE CASCADE;
