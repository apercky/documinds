import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupCompanies() {
  console.log("Setting up companies...");

  try {
    // Create sample companies
    const companies = [
      {
        code: "001",
        name: "Documinds",
        description: "Documinds S.p.A.",
        brandCode: "1_10",
      },
      {
        code: "056",
        name: "DIESEL",
        description: "DIESEL S.p.A.",
        brandCode: "2_20",
      },
      {
        code: "041",
        name: "Maison Margiela",
        description: "Maison Margiela fa parte del gruppo OTB",
        brandCode: "5_80",
      },
      {
        code: "027",
        name: "MARNI",
        description: "MARNI GROUP Srl",
        brandCode: "4_40",
      },
    ];

    for (const company of companies) {
      await prisma.company.upsert({
        where: { brandCode: company.brandCode },
        update: {}, // no update, only create if not exists
        create: company,
      });

      console.log(
        `✓ Ensured company exists: ${company.name} (${company.brandCode})`
      );
    }

    console.log("Companies setup completed!");
  } catch (error) {
    console.error("Error setting up companies:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupCompanies()
    .then(() => {
      console.log("Setup completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Setup failed:", error);
      process.exit(1);
    });
}
