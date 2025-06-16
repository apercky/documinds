import { PrismaClient } from "@prisma/client";
import { seedTranslations } from "./seeds/seed-translations";

const prisma = new PrismaClient();

async function runAllSeeds() {
  console.log("🚀 Starting database seeding...");

  try {
    // Run seeds in order

    // Seeds already run
    //await seedCompanies();
    await seedTranslations();

    // Add other seeds here:
    // await seedSettings();
    // await seedBrands();

    console.log("🎉 All seeds completed successfully!");
  } catch (error) {
    console.error("💥 Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  runAllSeeds()
    .then(() => {
      console.log("✅ Database seeding finished!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Database seeding failed:", error);
      process.exit(1);
    });
}

export { runAllSeeds };
