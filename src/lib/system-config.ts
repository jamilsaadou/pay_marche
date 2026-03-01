import { prisma } from "@/lib/prisma";

export async function getSystemConfig() {
  return prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export function configDecimalToNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber());
  }

  return 0;
}
