import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const ENCRYPTION_KEY =
  process.env.SERVER_KEY || "default-key-change-in-production";
const ALGORITHM = "aes-256-cbc";

/**
 * Encrypt a value using AES encryption
 */
async function encryptValue(value: string): Promise<string> {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Check if a value is bcrypt-encrypted (starts with $2a$, $2b$, etc.)
 */
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$/.test(value);
}

/**
 * Migrate existing bcrypt-encrypted settings to AES encryption
 */
async function migrateEncryption() {
  console.log("🔄 Starting encryption migration...");

  try {
    // Find all encrypted settings
    const encryptedSettings = await prisma.setting.findMany({
      where: {
        isEncrypted: true,
        encryptedValue: {
          not: null,
        },
      },
    });

    console.log(`📊 Found ${encryptedSettings.length} encrypted settings`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const setting of encryptedSettings) {
      if (!setting.encryptedValue) continue;

      // Check if this is a bcrypt hash
      if (isBcryptHash(setting.encryptedValue)) {
        console.log(
          `⚠️  Found bcrypt-encrypted setting: ${setting.brandCode}/${setting.settingKey}`
        );
        console.log(
          `   This setting needs manual re-entry as bcrypt cannot be decrypted.`
        );
        console.log(`   Setting will be marked for re-entry.`);

        // Clear the bcrypt value and mark for re-entry
        await prisma.setting.update({
          where: { id: setting.id },
          data: {
            encryptedValue: null,
            lastModifiedBy: "migration-script",
            updatedAt: new Date(),
          },
        });

        migratedCount++;
      } else {
        // Already using AES or other encryption
        console.log(
          `✅ Setting ${setting.brandCode}/${setting.settingKey} already uses modern encryption`
        );
        skippedCount++;
      }
    }

    console.log(`✨ Migration completed!`);
    console.log(`   - Migrated (cleared for re-entry): ${migratedCount}`);
    console.log(`   - Skipped (already modern): ${skippedCount}`);
    console.log(`   - Total processed: ${encryptedSettings.length}`);

    if (migratedCount > 0) {
      console.log(
        `\n⚠️  IMPORTANT: ${migratedCount} API keys need to be re-entered through the UI.`
      );
      console.log(
        `   These were previously encrypted with bcrypt and cannot be automatically migrated.`
      );
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateEncryption()
    .then(() => {
      console.log("🎉 Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration script failed:", error);
      process.exit(1);
    });
}

export { migrateEncryption };
