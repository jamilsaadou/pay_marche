import "dotenv/config";
import { hash } from "bcryptjs";

import { UserRole } from "../src/generated/prisma/enums";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";
  const collectorPassword = process.env.SEED_COLLECTOR_PASSWORD ?? "Collect1234!";

  const [adminHash, collectorHash] = await Promise.all([hash(adminPassword, 10), hash(collectorPassword, 10)]);

  await prisma.user.upsert({
    where: { email: "admin@plateforme.com" },
    update: {
      fullName: "Administrateur Principal",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      fullName: "Administrateur Principal",
      email: "admin@plateforme.com",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "collecteur@plateforme.com" },
    update: {
      fullName: "Collecteur Demo",
      passwordHash: collectorHash,
      role: UserRole.COLLECTOR,
      isActive: true,
    },
    create: {
      fullName: "Collecteur Demo",
      email: "collecteur@plateforme.com",
      passwordHash: collectorHash,
      role: UserRole.COLLECTOR,
      isActive: true,
    },
  });

  await prisma.booth.createMany({
    data: [
      { code: "BOUT-A01", zone: "Zone Orange" },
      { code: "BOUT-A02", zone: "Zone Orange" },
      { code: "BOUT-V11", zone: "Zone Verte" },
      { code: "BOUT-V12", zone: "Zone Verte" },
    ],
    skipDuplicates: true,
  });

  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      defaultExpectedAmount: 0,
      minPaymentAmount: 0,
      maxPaymentAmount: 100000000,
      allowPartialPayments: true,
      currency: "XOF",
    },
  });

  console.log("Seed termine.");
  console.log("Admin: admin@plateforme.com /", adminPassword);
  console.log("Collecteur: collecteur@plateforme.com /", collectorPassword);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
