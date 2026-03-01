import { NextResponse } from "next/server";

import { UserRole, type PaymentMethod } from "@/generated/prisma/enums";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { recordPaymentForExhibitor } from "@/lib/payment";

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.COLLECTOR)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    referenceNumber?: string;
    phone?: string;
    amount?: number;
    method?: PaymentMethod;
    reference?: string;
    notes?: string;
  };

  const result = await recordPaymentForExhibitor({
    referenceNumber: String(body.referenceNumber ?? ""),
    phone: String(body.phone ?? ""),
    amount: Number(body.amount ?? 0),
    method: body.method,
    reference: body.reference,
    notes: body.notes,
    collectorId: user.id,
  });

  if (!result.success) {
    await logActivity({
      actor: user,
      actionKey: "PAYMENT_CREATE_REJECTED",
      actionLabel: "Paiement rejete",
      module: "PAIEMENTS_API",
      targetType: body.referenceNumber ? "EXHIBITOR_REFERENCE" : "EXHIBITOR_PHONE",
      targetId: String(body.referenceNumber ?? body.phone ?? ""),
      description: `Tentative de paiement invalide (${result.reason}).`,
      metadata: {
        referenceNumber: body.referenceNumber ?? "",
        phone: body.phone ?? "",
        amount: Number(body.amount ?? 0),
        reason: result.reason,
      },
    });

    return NextResponse.json(
      {
        error: result.reason,
        minPaymentAmount: "minPaymentAmount" in result ? result.minPaymentAmount : undefined,
        maxPaymentAmount: "maxPaymentAmount" in result ? result.maxPaymentAmount : undefined,
        remainingAmount: "remainingAmount" in result ? result.remainingAmount : undefined,
      },
      { status: 400 },
    );
  }

  await logActivity({
    actor: user,
    actionKey: "PAYMENT_CREATED",
    actionLabel: "Paiement enregistre",
    module: "PAIEMENTS_API",
    targetType: "PAYMENT",
    targetId: result.payment.id,
    description: `Paiement enregistre pour ${result.payment.exhibitor.referenceNumber}.`,
    metadata: {
      paymentId: result.payment.id,
      exhibitorId: result.payment.exhibitor.id,
      exhibitorReference: result.payment.exhibitor.referenceNumber,
      resolvedBy: result.resolvedBy,
      amount: Number(body.amount ?? 0),
      method: body.method ?? "CASH",
    },
  });

  return NextResponse.json({
    success: true,
    paymentId: result.payment.id,
    exhibitor: result.payment.exhibitor,
    status: result.status,
  });
}
