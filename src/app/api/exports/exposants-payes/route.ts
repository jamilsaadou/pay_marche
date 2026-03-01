import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!user || user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paidExhibitors = await prisma.exhibitor.findMany({
    where: { status: "PAID" },
    include: {
      boothAssignment: {
        include: {
          booth: {
            select: { code: true, zone: true },
          },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const rows = paidExhibitors.map((exhibitor) => ({
    "N° Référence": exhibitor.referenceNumber,
    Prénom: exhibitor.firstName ?? "",
    Nom: exhibitor.lastName ?? exhibitor.fullName,
    Email: exhibitor.email ?? "",
    Téléphone: exhibitor.phone ?? "",
    "Âge": exhibitor.age ?? "",
    Sexe: exhibitor.gender ?? "",
    Nationalité: exhibitor.nationality ?? "",
    Adresse: exhibitor.address ?? "",
    Entreprise: exhibitor.companyName ?? "",
    "Registre Commerce": exhibitor.businessRegister ?? "",
    "Secteur d'activité": exhibitor.activitySector ?? "",
    Localisation: exhibitor.location ?? "",
    Région: exhibitor.region ?? "",
    "Montant attendu": toNumber(exhibitor.expectedAmount),
    "Montant payé": toNumber(exhibitor.totalPaid),
    Statut: exhibitor.status,
    Boutique: exhibitor.boothAssignment?.booth.code ?? "",
    "Zone boutique": exhibitor.boothAssignment?.booth.zone ?? "",
    "Date création": new Date(exhibitor.createdAt).toLocaleString("fr-FR"),
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Exposants Payes");

  const fileBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const fileName = `exposants_payes_${new Date().toISOString().slice(0, 10)}.xlsx`;

  await logActivity({
    actor: user,
    actionKey: "EXHIBITOR_EXPORT_PAID_EXCEL",
    actionLabel: "Export Excel des exposants payes",
    module: "PARAMETRES",
    targetType: "EXHIBITOR",
    description: `${rows.length} exposants payes exportes en Excel.`,
    metadata: { exportedCount: rows.length },
  });

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "no-store",
    },
  });
}
