import { ExhibitorStatus } from "@/generated/prisma/enums";

export function resolveExhibitorStatus(totalPaid: number, expectedAmount: number) {
  if (expectedAmount <= 0) {
    return totalPaid > 0 ? ExhibitorStatus.PAID : ExhibitorStatus.PENDING;
  }

  if (totalPaid >= expectedAmount && expectedAmount > 0) {
    return ExhibitorStatus.PAID;
  }

  if (totalPaid > 0) {
    return ExhibitorStatus.PARTIAL;
  }

  return ExhibitorStatus.PENDING;
}
