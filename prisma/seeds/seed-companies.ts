import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedCompanies() {
  console.log("🏢 Setting up companies...");

  try {
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
        update: {},
        create: company,
      });

      console.log(`✓ Company: ${company.name} (${company.brandCode})`);
    }

    console.log("✅ Companies setup completed!");
  } catch (error) {
    console.error("❌ Error setting up companies:", error);
    throw error;
  }
}
