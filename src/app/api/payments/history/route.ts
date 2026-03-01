import { NextResponse } from "next/server";

import { PaymentMethod, UserRole } from "@/generated/prisma/enums";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const allowedMethods = new Set(Object.values(PaymentMethod));

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function toDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.COLLECTOR)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const page = toPositiveInt(searchParams.get("page"), 1);
  const limit = Math.min(toPositiveInt(searchParams.get("limit"), 20), 100);
  const referenceNumber = (searchParams.get("referenceNumber") ?? "").trim();
  const methodRaw = (searchParams.get("method") ?? "").trim();
  const from = toDate(searchParams.get("from"));
  const to = toDate(searchParams.get("to"));

  if (searchParams.get("from") && !from) {
    return NextResponse.json({ error: "INVALID_FROM_DATE" }, { status: 400 });
  }

  if (searchParams.get("to") && !to) {
    return NextResponse.json({ error: "INVALID_TO_DATE" }, { status: 400 });
  }

  if (methodRaw && !allowedMethods.has(methodRaw as PaymentMethod)) {
    return NextResponse.json({ error: "INVALID_METHOD" }, { status: 400 });
  }

  const where = {
    ...(user.role === UserRole.COLLECTOR ? { collectorId: user.id } : {}),
    ...(referenceNumber ? { exhibitor: { referenceNumber } } : {}),
    ...(methodRaw ? { method: methodRaw as PaymentMethod } : {}),
    ...(from || to
      ? {
          paidAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [totalItems, payments, totals] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: {
        exhibitor: {
          select: {
            id: true,
            referenceNumber: true,
            fullName: true,
            companyName: true,
            phone: true,
          },
        },
        collector: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.aggregate({
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  await logActivity({
    actor: user,
    actionKey: "PAYMENT_HISTORY_VIEWED",
    actionLabel: "Consultation historique de collecte",
    module: "PAIEMENTS_API",
    targetType: "PAYMENT",
    description: "Consultation de l'historique des paiements.",
    metadata: {
      page,
      limit,
      referenceNumber: referenceNumber || null,
      method: methodRaw || null,
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      totalItems,
    },
  });

  return NextResponse.json({
    success: true,
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    summary: {
      count: totals._count._all,
      amount: toNumber(totals._sum.amount ?? 0),
    },
    items: payments.map((payment) => ({
      id: payment.id,
      amount: toNumber(payment.amount),
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
      paidAt: payment.paidAt,
      exhibitor: payment.exhibitor,
      collector: payment.collector,
    })),
  });
}
