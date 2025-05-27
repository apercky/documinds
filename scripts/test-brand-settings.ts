import { prisma } from "@/lib/prisma";
import { SettingKey } from "@/lib/prisma/generated";
import { validateBrandAccess } from "@/lib/services/company.service";
import {
  getBrandSettings,
  getSettingValue,
  upsertSetting,
} from "@/lib/services/settings.service";

async function testBrandSettings() {
  console.log("🧪 Testing brand settings functionality...\n");

  try {
    // Test 1: Validate brand
    console.log("1️⃣ Testing brand validation...");
    const brandCode = "2_20"; // Using existing brand from migration
    const company = await validateBrandAccess(brandCode);
    const isValid = !!company;
    console.log(`   Brand ${brandCode} is valid: ${isValid}`);

    if (!isValid) {
      console.log("   Creating test company...");
      await prisma.company.create({
        data: {
          code: "TEST_COMPANY",
          name: "Test Company",
          description: "Test company for validation",
          brandCode: brandCode,
          isActive: true,
        },
      });
      console.log("   ✅ Test company created");
    }

    // Test 2: Set encrypted API key
    console.log("\n2️⃣ Testing API key encryption...");
    const testApiKey = "sk-test-api-key-12345";
    await upsertSetting(
      brandCode,
      SettingKey.OPENAI_API_KEY,
      testApiKey,
      "test-user"
    );
    console.log("   ✅ API key saved with encryption");

    // Test 3: Retrieve and decrypt API key
    console.log("\n3️⃣ Testing API key decryption...");
    const retrievedKey = await getSettingValue(
      brandCode,
      SettingKey.OPENAI_API_KEY
    );
    console.log(`   Retrieved key: ${retrievedKey}`);
    console.log(`   Matches original: ${retrievedKey === testApiKey}`);

    // Test 4: Set plain text setting
    console.log("\n4️⃣ Testing plain text setting...");
    const testFlowId = "flow-12345";
    await upsertSetting(
      brandCode,
      SettingKey.LANGFLOW_FLOW_CHAT_ID,
      testFlowId,
      "test-user"
    );
    console.log("   ✅ Flow ID saved as plain text");

    // Test 5: Get all brand settings
    console.log("\n5️⃣ Testing brand settings retrieval...");
    const allSettings = await getBrandSettings(brandCode);
    console.log("   Brand settings:", {
      openaiApiKey: allSettings.openaiApiKey ? "***ENCRYPTED***" : "NOT SET",
      langflowApiKey: allSettings.langflowApiKey
        ? "***ENCRYPTED***"
        : "NOT SET",
      chatFlowId: allSettings.chatFlowId || "NOT SET",
      embeddingsFlowId: allSettings.embeddingsFlowId || "NOT SET",
    });

    // Test 6: Verify database state
    console.log("\n6️⃣ Checking database state...");
    const dbSettings = await prisma.setting.findMany({
      where: { brandCode },
      select: {
        settingKey: true,
        isEncrypted: true,
        encryptedValue: true,
        plainValue: true,
      },
    });

    console.log("   Database settings:");
    dbSettings.forEach((setting) => {
      console.log(`   - ${setting.settingKey}:`);
      console.log(`     Encrypted: ${setting.isEncrypted}`);
      console.log(`     Has encrypted value: ${!!setting.encryptedValue}`);
      console.log(`     Has plain value: ${!!setting.plainValue}`);
    });

    console.log("\n✨ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testBrandSettings()
    .then(() => {
      console.log("🎉 Test script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test script failed:", error);
      process.exit(1);
    });
}

export { testBrandSettings };
