import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.COLLECTOR)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where = user.role === UserRole.ADMIN ? {} : { collectorId: user.id };

  const payments = await prisma.payment.findMany({
    where,
    include: {
      exhibitor: {
        select: {
          referenceNumber: true,
          fullName: true,
          companyName: true,
          phone: true,
        },
      },
      collector: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  const rows = payments.map((payment) => ({
    "Date paiement": new Date(payment.paidAt).toLocaleString("fr-FR"),
    "Reference exposant": payment.exhibitor.referenceNumber,
    Exposant: payment.exhibitor.fullName,
    Entreprise: payment.exhibitor.companyName ?? "",
    "Telephone exposant": payment.exhibitor.phone ?? "",
    "Montant (XOF)": toNumber(payment.amount),
    Mode: payment.method,
    "Reference transaction": payment.reference ?? "",
    Notes: payment.notes ?? "",
    Collecteur: payment.collector.fullName,
    "Email collecteur": payment.collector.email,
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Paiements");

  const fileBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const fileName = `paiements_${new Date().toISOString().slice(0, 10)}.xlsx`;

  await logActivity({
    actor: user,
    actionKey: "PAYMENT_EXPORT_EXCEL",
    actionLabel: "Export Excel des paiements",
    module: "PAIEMENTS",
    targetType: "PAYMENT",
    description: `${rows.length} paiements exportes en Excel.`,
    metadata: {
      exportedCount: rows.length,
      scopedToCollector: user.role === UserRole.COLLECTOR,
    },
  });

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "no-store",
    },
  });
}
