import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupCompanies() {
  console.log("Setting up companies...");

  try {
    // Create sample companies
    const companies = [
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
      const existing = await prisma.company.findUnique({
        where: { brandCode: company.brandCode },
      });

      if (!existing) {
        await prisma.company.create({
          data: company,
        });
        console.log(
          `✓ Created company: ${company.name} (${company.brandCode})`
        );
      } else {
        console.log(
          `- Company already exists: ${company.name} (${company.brandCode})`
        );
      }
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

export { setupCompanies };
