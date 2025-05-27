import { prisma } from "@/lib/prisma";
import { getBrandSettings } from "@/lib/services/settings.service";

async function debugBrandSettings() {
  console.log("🔍 Debugging brand settings in database...\n");

  try {
    // 1. Check all companies
    console.log("1️⃣ All companies in database:");
    const companies = await prisma.company.findMany({
      orderBy: { brandCode: "asc" },
    });

    if (companies.length === 0) {
      console.log("   ❌ No companies found in database!");
      return;
    }

    companies.forEach((company) => {
      console.log(
        `   - ${company.brandCode}: ${company.name} (Active: ${company.isActive})`
      );
    });

    // 2. Check all settings
    console.log("\n2️⃣ All settings in database:");
    const allSettings = await prisma.setting.findMany({
      include: {
        company: true,
      },
      orderBy: [{ brandCode: "asc" }, { settingKey: "asc" }],
    });

    if (allSettings.length === 0) {
      console.log("   ❌ No settings found in database!");
      return;
    }

    allSettings.forEach((setting) => {
      console.log(`   - ${setting.brandCode}/${setting.settingKey}:`);
      console.log(`     Encrypted: ${setting.isEncrypted}`);
      console.log(`     Has encrypted value: ${!!setting.encryptedValue}`);
      console.log(`     Has plain value: ${!!setting.plainValue}`);
      if (!setting.isEncrypted && setting.plainValue) {
        console.log(`     Plain value: ${setting.plainValue}`);
      }
    });

    // 3. Test getBrandSettings for each brand
    console.log("\n3️⃣ Testing getBrandSettings for each brand:");
    for (const company of companies) {
      if (!company.isActive) {
        console.log(`   ⏭️  Skipping inactive brand: ${company.brandCode}`);
        continue;
      }

      console.log(`   Testing brand: ${company.brandCode}`);
      try {
        const brandSettings = await getBrandSettings(company.brandCode);
        console.log(`     ✅ Settings retrieved:`, {
          openaiApiKey: brandSettings.openaiApiKey ? "***SET***" : "NOT SET",
          langflowApiKey: brandSettings.langflowApiKey
            ? "***SET***"
            : "NOT SET",
          chatFlowId: brandSettings.chatFlowId || "NOT SET",
          embeddingsFlowId: brandSettings.embeddingsFlowId || "NOT SET",
        });
      } catch (error) {
        console.log(`     ❌ Error retrieving settings:`, error);
      }
    }

    // 4. Check for common brand codes that might be used in auth
    console.log("\n4️⃣ Testing common brand patterns:");
    const commonBrands = ["2_20", "brand_1", "test", "default"];

    for (const brandCode of commonBrands) {
      const company = await prisma.company.findUnique({
        where: { brandCode },
      });

      if (company) {
        console.log(`   ✅ Found brand: ${brandCode} -> ${company.name}`);
        const settings = await getBrandSettings(brandCode);
        console.log(`     Settings:`, {
          openaiApiKey: settings.openaiApiKey ? "***SET***" : "NOT SET",
          langflowApiKey: settings.langflowApiKey ? "***SET***" : "NOT SET",
          chatFlowId: settings.chatFlowId || "NOT SET",
          embeddingsFlowId: settings.embeddingsFlowId || "NOT SET",
        });
      } else {
        console.log(`   ❌ Brand not found: ${brandCode}`);
      }
    }
  } catch (error) {
    console.error("❌ Debug failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run debug if this script is executed directly
if (require.main === module) {
  debugBrandSettings()
    .then(() => {
      console.log("\n🎉 Debug script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Debug script failed:", error);
      process.exit(1);
    });
}

export { debugBrandSettings };
