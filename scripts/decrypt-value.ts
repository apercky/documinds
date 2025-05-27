import { prisma } from "@/lib/prisma";
import { SettingKey } from "@/lib/prisma/generated";
import crypto from "crypto";

const ENCRYPTION_KEY =
  process.env.SERVER_KEY || "default-key-change-in-production";
const ALGORITHM = "aes-256-cbc";

/**
 * Decrypt a value using AES encryption (same as in settings.service.ts)
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
 * Decrypt a specific setting from the database
 */
async function decryptSetting(brandCode: string, settingKey: SettingKey) {
  console.log(`🔓 Decrypting setting: ${brandCode}/${settingKey}`);

  try {
    const setting = await prisma.setting.findUnique({
      where: {
        brandCode_settingKey: {
          brandCode,
          settingKey,
        },
      },
    });

    if (!setting) {
      console.log(`   ❌ Setting not found: ${brandCode}/${settingKey}`);
      return null;
    }

    console.log(`   📊 Setting info:`);
    console.log(`     - Encrypted: ${setting.isEncrypted}`);
    console.log(`     - Has encrypted value: ${!!setting.encryptedValue}`);
    console.log(`     - Has plain value: ${!!setting.plainValue}`);
    console.log(`     - Created: ${setting.createdAt}`);
    console.log(`     - Updated: ${setting.updatedAt}`);
    console.log(`     - Last modified by: ${setting.lastModifiedBy}`);

    if (setting.isEncrypted && setting.encryptedValue) {
      console.log(
        `   🔐 Encrypted value (first 40 chars): ${setting.encryptedValue.substring(
          0,
          40
        )}...`
      );

      try {
        const decryptedValue = await decryptValue(setting.encryptedValue);
        console.log(`   ✅ Decrypted value: ${decryptedValue}`);
        return decryptedValue;
      } catch (error) {
        console.log(`   ❌ Failed to decrypt: ${error}`);
        return null;
      }
    } else if (!setting.isEncrypted && setting.plainValue) {
      console.log(`   📝 Plain value: ${setting.plainValue}`);
      return setting.plainValue;
    } else {
      console.log(`   ⚠️  No value found (neither encrypted nor plain)`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error retrieving setting: ${error}`);
    return null;
  }
}

/**
 * Decrypt all encrypted settings for a brand
 */
async function decryptAllBrandSettings(brandCode: string) {
  console.log(`🔓 Decrypting all settings for brand: ${brandCode}\n`);

  try {
    const settings = await prisma.setting.findMany({
      where: { brandCode },
      orderBy: { settingKey: "asc" },
    });

    if (settings.length === 0) {
      console.log(`   ❌ No settings found for brand: ${brandCode}`);
      return;
    }

    for (const setting of settings) {
      console.log(`📋 ${setting.settingKey}:`);

      if (setting.isEncrypted && setting.encryptedValue) {
        console.log(
          `   🔐 Encrypted value (first 40 chars): ${setting.encryptedValue.substring(
            0,
            40
          )}...`
        );

        try {
          const decryptedValue = await decryptValue(setting.encryptedValue);
          console.log(`   ✅ Decrypted: ${decryptedValue}`);
        } catch (error) {
          console.log(`   ❌ Decryption failed: ${error}`);
        }
      } else if (!setting.isEncrypted && setting.plainValue) {
        console.log(`   📝 Plain value: ${setting.plainValue}`);
      } else {
        console.log(`   ⚠️  No value found`);
      }
      console.log("");
    }
  } catch (error) {
    console.error(`❌ Error retrieving settings: ${error}`);
  }
}

/**
 * Decrypt a raw encrypted value (not from database)
 */
async function decryptRawValue(encryptedValue: string) {
  console.log(`🔓 Decrypting raw value...`);
  console.log(
    `   🔐 Encrypted (first 40 chars): ${encryptedValue.substring(0, 40)}...`
  );

  try {
    const decryptedValue = await decryptValue(encryptedValue);
    console.log(`   ✅ Decrypted: ${decryptedValue}`);
    return decryptedValue;
  } catch (error) {
    console.log(`   ❌ Decryption failed: ${error}`);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🔓 Decrypt Database Values Script

Usage:
  npx tsx scripts/decrypt-value.ts <command> [options]

Commands:
  setting <brandCode> <settingKey>  - Decrypt a specific setting
  brand <brandCode>                 - Decrypt all settings for a brand
  raw <encryptedValue>              - Decrypt a raw encrypted value

Examples:
  npx tsx scripts/decrypt-value.ts setting 2_20 OPENAI_API_KEY
  npx tsx scripts/decrypt-value.ts brand 2_20
  npx tsx scripts/decrypt-value.ts raw "abc123:def456..."

Available setting keys:
  - OPENAI_API_KEY
  - LANGFLOW_API_KEY
  - LANGFLOW_FLOW_CHAT_ID
  - LANGFLOW_FLOW_EMBEDDINGS_ID
`);
    process.exit(0);
  }

  const command = args[0];

  try {
    switch (command) {
      case "setting":
        if (args.length < 3) {
          console.error("❌ Usage: setting <brandCode> <settingKey>");
          process.exit(1);
        }
        await decryptSetting(args[1], args[2] as SettingKey);
        break;

      case "brand":
        if (args.length < 2) {
          console.error("❌ Usage: brand <brandCode>");
          process.exit(1);
        }
        await decryptAllBrandSettings(args[1]);
        break;

      case "raw":
        if (args.length < 2) {
          console.error("❌ Usage: raw <encryptedValue>");
          process.exit(1);
        }
        await decryptRawValue(args[1]);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.error("Available commands: setting, brand, raw");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run main if this script is executed directly
if (require.main === module) {
  main();
}

export {
  decryptAllBrandSettings,
  decryptRawValue,
  decryptSetting,
  decryptValue,
};
