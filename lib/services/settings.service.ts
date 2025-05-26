"use server";

import { prisma } from "@/lib/prisma";
import { Setting, SettingKey } from "@/lib/prisma/generated";
import bcrypt from "bcryptjs";

const SERVER_KEY = process.env.SERVER_KEY || "default-server-key";

/**
 * Encrypt a value using bcrypt
 */
async function encryptValue(value: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(value, saltRounds);
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
