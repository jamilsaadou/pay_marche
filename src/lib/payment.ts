import { ExhibitorStatus, PaymentMethod } from "@/generated/prisma/enums";

import { resolveExhibitorStatus } from "@/lib/exhibitor-status";
import { prisma } from "@/lib/prisma";
import { configDecimalToNumber, getSystemConfig } from "@/lib/system-config";

const allowedPaymentMethods = new Set(Object.values(PaymentMethod));
const DECIMAL_EPSILON = 0.0001;

type RecordPaymentInput = {
  referenceNumber?: string;
  phone?: string;
  amount: number;
  collectorId: string;
  method?: string;
  reference?: string;
  notes?: string;
};

export async function recordPaymentForExhibitor(input: RecordPaymentInput) {
  const referenceNumber = input.referenceNumber?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";

  if ((!referenceNumber && !phone) || !Number.isFinite(input.amount) || input.amount <= 0) {
    return { success: false as const, reason: "INVALID_PAYLOAD" as const };
  }

  const systemConfig = await getSystemConfig();
  const minPaymentAmount = configDecimalToNumber(systemConfig.minPaymentAmount);
  const maxPaymentAmount = configDecimalToNumber(systemConfig.maxPaymentAmount);
  const allowPartialPayments = Boolean(systemConfig.allowPartialPayments);

  if (input.amount < minPaymentAmount || input.amount > maxPaymentAmount) {
    return {
      success: false as const,
      reason: "PAYMENT_AMOUNT_OUT_OF_RANGE" as const,
      minPaymentAmount,
      maxPaymentAmount,
    };
  }

  const paymentMethod =
    input.method && allowedPaymentMethods.has(input.method as PaymentMethod)
      ? (input.method as PaymentMethod)
      : PaymentMethod.CASH;

  const result = await prisma.$transaction(async (tx) => {
    let exhibitor:
      | {
          id: string;
          totalPaid: unknown;
          expectedAmount: unknown;
          referenceNumber: string;
        }
      | null = null;
    let resolvedBy: "REFERENCE" | "PHONE" = "REFERENCE";

    if (referenceNumber) {
      exhibitor = await tx.exhibitor.findUnique({
        where: { referenceNumber },
        select: {
          id: true,
          totalPaid: true,
          expectedAmount: true,
          referenceNumber: true,
        },
      });
      resolvedBy = "REFERENCE";
    } else {
      const byPhone = await tx.exhibitor.findMany({
        where: { phone },
        orderBy: { createdAt: "asc" },
        take: 2,
        select: {
          id: true,
          totalPaid: true,
          expectedAmount: true,
          referenceNumber: true,
        },
      });

      if (byPhone.length > 1) {
        return { success: false as const, reason: "PHONE_NOT_UNIQUE" as const };
      }

      exhibitor = byPhone[0] ?? null;
      resolvedBy = "PHONE";
    }

    if (!exhibitor) {
      return { success: false as const, reason: "EXHIBITOR_NOT_FOUND" as const };
    }

    const currentTotalPaid = Number(exhibitor.totalPaid);
    const expectedAmount = Number(exhibitor.expectedAmount);
    const remainingAmount = Math.max(expectedAmount - currentTotalPaid, 0);

    if (!allowPartialPayments && remainingAmount > 0 && Math.abs(input.amount - remainingAmount) > DECIMAL_EPSILON) {
      return {
        success: false as const,
        reason: "PARTIAL_PAYMENT_DISABLED" as const,
        remainingAmount,
      };
    }

    const nextTotalPaid = currentTotalPaid + input.amount;
    const status = resolveExhibitorStatus(nextTotalPaid, expectedAmount);

    const payment = await tx.payment.create({
      data: {
        exhibitorId: exhibitor.id,
        collectorId: input.collectorId,
        amount: input.amount,
        method: paymentMethod,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
      },
      include: {
        exhibitor: {
          select: {
            id: true,
            referenceNumber: true,
            fullName: true,
          },
        },
      },
    });

    await tx.exhibitor.update({
      where: { id: exhibitor.id },
      data: {
        totalPaid: nextTotalPaid,
        status: status as ExhibitorStatus,
      },
    });

    return {
      success: true as const,
      payment,
      exhibitorId: exhibitor.id,
      nextTotalPaid,
      status,
      resolvedBy,
    };
  });

  return result;
}
