"use server";

import { prisma } from "@/lib/prisma";
import { Company } from "@/lib/prisma/generated";

/**
 * Validate if a brand code exists and is active
 */
export async function validateBrandAccess(brandCode: string) {
  try {
    const company = await prisma.company.findUnique({
      where: {
        brandCode,
        isActive: true,
      },
      include: {
        settings: true,
      },
    });

    return company;
  } catch (error) {
    console.error("Error validating brand access:", error);
    return null;
  }
}

/**
 * Get all active companies
 */
export async function getActiveCompanies(): Promise<Company[]> {
  return prisma.company.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      settings: true,
    },
  });
}

/**
 * Get company by brand code with settings count
 */
export async function getCompanyWithStats(brandCode: string) {
  const company = await prisma.company.findUnique({
    where: { brandCode },
    include: {
      _count: {
        select: { settings: true },
      },
    },
  });

  return company;
}

/**
 * Create a new company
 */
export async function createCompany(data: {
  code: string;
  name: string;
  description?: string;
  brandCode: string;
}) {
  return prisma.company.create({
    data: {
      code: data.code,
      name: data.name,
      description: data.description,
      brandCode: data.brandCode,
    },
  });
}

/**
 * Update company information
 */
export async function updateCompany(
  id: number,
  data: {
    code?: string;
    name?: string;
    description?: string;
    isActive?: boolean;
  }
) {
  return prisma.company.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete a company (will cascade delete settings)
 */
export async function deleteCompany(id: number) {
  return prisma.company.delete({
    where: { id },
  });
}
