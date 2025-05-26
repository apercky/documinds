import crypto from "crypto";

const ENCRYPTION_KEY =
  process.env.SERVER_KEY || "default-key-change-in-production";
const ALGORITHM = "aes-256-cbc";

/**
 * Encrypt a value using AES encryption (same as in settings.service.ts)
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

async function testEncryption() {
  console.log("🔐 Testing encryption/decryption functionality...\n");

  const testValues = [
    "sk-test-api-key-12345",
    "langflow-api-key-67890",
    "simple-password",
    "complex-password-with-special-chars!@#$%^&*()",
    "very-long-password-that-contains-many-characters-and-should-still-work-correctly-123456789",
  ];

  try {
    for (let i = 0; i < testValues.length; i++) {
      const originalValue = testValues[i];
      console.log(
        `Test ${i + 1}: Testing value "${originalValue.substring(0, 20)}..."`
      );

      // Encrypt the value
      const encrypted = await encryptValue(originalValue);
      console.log(`   ✅ Encrypted: ${encrypted.substring(0, 40)}...`);

      // Validate encrypted format
      const parts = encrypted.split(":");
      if (parts.length !== 2) {
        throw new Error("Invalid encrypted format");
      }
      console.log(
        `   ✅ Format valid: IV(${parts[0].length} chars) : Data(${parts[1].length} chars)`
      );

      // Decrypt the value
      const decrypted = await decryptValue(encrypted);
      console.log(`   ✅ Decrypted: ${decrypted.substring(0, 20)}...`);

      // Verify they match
      if (originalValue === decrypted) {
        console.log(`   ✅ Match: Original and decrypted values are identical`);
      } else {
        throw new Error("Decrypted value does not match original");
      }

      console.log("");
    }

    // Test error cases
    console.log("🚨 Testing error cases...");

    try {
      await decryptValue("invalid-format");
      console.log("   ❌ Should have failed for invalid format");
    } catch (error) {
      console.log("   ✅ Correctly rejected invalid format");
    }

    try {
      await decryptValue("short:data");
      console.log("   ❌ Should have failed for short IV");
    } catch (error) {
      console.log("   ✅ Correctly rejected short IV");
    }

    try {
      await decryptValue("12345678901234567890123456789012:");
      console.log("   ❌ Should have failed for empty data");
    } catch (error) {
      console.log("   ✅ Correctly rejected empty encrypted data");
    }

    console.log("\n🎉 All encryption tests passed!");
  } catch (error) {
    console.error("❌ Encryption test failed:", error);
    throw error;
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testEncryption()
    .then(() => {
      console.log("🎉 Encryption test script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Encryption test script failed:", error);
      process.exit(1);
    });
}

export { decryptValue, encryptValue, testEncryption };
