"use server";

import { prisma } from "@/lib/prisma";
import { Setting, SettingKey } from "@prisma/client";
import crypto from "crypto";

const ENCRYPTION_KEY =
  process.env.SERVER_KEY || "default-key-change-in-production";
const ALGORITHM = "aes-256-cbc";

/**
 * Encrypt a value using AES encryption
 */
async function encryptValue(value: string): Promise<string> {
  if (!value || typeof value !== "string") {
    throw new Error("Value to encrypt must be a non-empty string");
  }

  if (
    !ENCRYPTION_KEY ||
    ENCRYPTION_KEY === "default-key-change-in-production"
  ) {
    throw new Error(
      "SERVER_KEY environment variable must be set for encryption"
    );
  }

  try {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Format: iv:encrypted_data
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt value");
  }
}

/**
 * Decrypt a value using AES encryption
 */
async function decryptValue(encryptedValue: string): Promise<string> {
  if (!encryptedValue || typeof encryptedValue !== "string") {
    throw new Error("Encrypted value must be a non-empty string");
  }

  if (
    !ENCRYPTION_KEY ||
    ENCRYPTION_KEY === "default-key-change-in-production"
  ) {
    throw new Error(
      "SERVER_KEY environment variable must be set for decryption"
    );
  }

  try {
    // Validate format: should contain exactly one colon separating IV and encrypted data
    const parts = encryptedValue.split(":");
    if (parts.length !== 2) {
      throw new Error(
        "Invalid encrypted value format. Expected format: iv:encrypted_data"
      );
    }

    const [ivHex, encryptedHex] = parts;

    // Validate IV length (should be 32 hex characters = 16 bytes)
    if (ivHex.length !== 32) {
      throw new Error("Invalid IV length. Expected 32 hex characters.");
    }

    // Validate encrypted data is not empty
    if (!encryptedHex) {
      throw new Error("Encrypted data is empty");
    }

    const iv = Buffer.from(ivHex, "hex");
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error(
      `Failed to decrypt value: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get all settings for a brand
 */
export async function getSettingsByBrand(
  brandCode: string
): Promise<Setting[]> {
  return prisma.setting.findMany({
    where: { brandCode },
    include: {
      company: true,
    },
    orderBy: { settingKey: "asc" },
  });
}

/**
 * Get a specific setting by brand and key
 */
export async function getSetting(
  brandCode: string,
  settingKey: SettingKey
): Promise<Setting | null> {
  return prisma.setting.findUnique({
    where: {
      brandCode_settingKey: {
        brandCode,
        settingKey,
      },
    },
    include: {
      company: true,
    },
  });
}

/**
 * Upsert a setting (create or update)
 */
export async function upsertSetting(
  brandCode: string,
  settingKey: SettingKey,
  value: string,
  userId: string
): Promise<Setting> {
  // Determine if this setting should be encrypted
  const isEncrypted =
    settingKey === SettingKey.OPENAI_API_KEY ||
    settingKey === SettingKey.LANGFLOW_API_KEY;

  let encryptedValue: string | null = null;
  let plainValue: string | null = null;

  if (isEncrypted) {
    encryptedValue = await encryptValue(value);
  } else {
    plainValue = value;
  }

  return prisma.setting.upsert({
    where: {
      brandCode_settingKey: {
        brandCode,
        settingKey,
      },
    },
    update: {
      encryptedValue,
      plainValue,
      isEncrypted,
      lastModifiedBy: userId,
      updatedAt: new Date(),
    },
    create: {
      brandCode,
      settingKey,
      encryptedValue,
      plainValue,
      isEncrypted,
      createdBy: userId,
      lastModifiedBy: userId,
    },
    include: {
      company: true,
    },
  });
}

/**
 * Delete a setting
 */
export async function deleteSetting(
  brandCode: string,
  settingKey: SettingKey
): Promise<void> {
  await prisma.setting.delete({
    where: {
      brandCode_settingKey: {
        brandCode,
        settingKey,
      },
    },
  });
}

/**
 * Get settings formatted for UI (without encrypted values)
 */
export async function getSettingsForUI(brandCode: string) {
  const settings = await getSettingsByBrand(brandCode);

  return settings.map((setting) => ({
    settingKey: setting.settingKey,
    value: setting.isEncrypted ? "••••••••" : setting.plainValue,
    isEncrypted: setting.isEncrypted,
    hasValue: setting.isEncrypted
      ? !!setting.encryptedValue
      : !!setting.plainValue,
    updatedAt: setting.updatedAt,
    lastModifiedBy: setting.lastModifiedBy,
  }));
}

/**
 * Validate if a setting value exists (for API key validation)
 */
export async function validateSettingExists(
  brandCode: string,
  settingKey: SettingKey
): Promise<boolean> {
  const setting = await getSetting(brandCode, settingKey);

  if (!setting) return false;

  return setting.isEncrypted ? !!setting.encryptedValue : !!setting.plainValue;
}

/**
 * Get all settings with company information for admin view
 */
export async function getAllSettingsWithCompany() {
  return prisma.setting.findMany({
    include: {
      company: true,
    },
    orderBy: [{ company: { name: "asc" } }, { settingKey: "asc" }],
  });
}

/**
 * Get the actual decrypted value of a setting for API usage
 */
export async function getSettingValue(
  brandCode: string,
  settingKey: SettingKey
): Promise<string | null> {
  const setting = await getSetting(brandCode, settingKey);

  if (!setting) return null;

  if (setting.isEncrypted && setting.encryptedValue) {
    try {
      return await decryptValue(setting.encryptedValue);
    } catch (error) {
      console.error(
        `Failed to decrypt setting ${brandCode}/${settingKey}:`,
        error
      );
      // Log the corrupted value for debugging (first 20 chars only for security)
      console.error(
        `Corrupted encrypted value (first 20 chars): ${setting.encryptedValue.substring(
          0,
          20
        )}...`
      );
      return null;
    }
  }

  return setting.plainValue;
}

/**
 * Get multiple setting values for a brand
 */
export async function getBrandSettings(brandCode: string): Promise<{
  openaiApiKey?: string;
  langflowApiKey?: string;
  chatFlowId?: string;
  embeddingsFlowId?: string;
}> {
  const settings = await getSettingsByBrand(brandCode);

  const result: {
    openaiApiKey?: string;
    langflowApiKey?: string;
    chatFlowId?: string;
    embeddingsFlowId?: string;
  } = {};

  for (const setting of settings) {
    let value: string | null = null;

    if (setting.isEncrypted && setting.encryptedValue) {
      try {
        value = await decryptValue(setting.encryptedValue);
      } catch (error) {
        console.error(
          `Failed to decrypt setting ${setting.settingKey}:`,
          error
        );
        continue;
      }
    } else {
      value = setting.plainValue;
    }

    if (!value) continue;

    switch (setting.settingKey) {
      case SettingKey.OPENAI_API_KEY:
        result.openaiApiKey = value;
        break;
      case SettingKey.LANGFLOW_API_KEY:
        result.langflowApiKey = value;
        break;
      case SettingKey.LANGFLOW_FLOW_CHAT_ID:
        result.chatFlowId = value;
        break;
      case SettingKey.LANGFLOW_FLOW_EMBEDDINGS_ID:
        result.embeddingsFlowId = value;
        break;
    }
  }

  return result;
}
