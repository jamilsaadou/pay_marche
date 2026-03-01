import { NextResponse } from "next/server";

import { getCurrentUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const referenceNumber = (searchParams.get("referenceNumber") ?? "").trim();
  const phone = (searchParams.get("phone") ?? "").trim();

  if (!referenceNumber && !phone) {
    return NextResponse.json({ error: "referenceNumber or phone is required" }, { status: 400 });
  }

  const exhibitorInclude = {
    boothAssignment: {
      include: {
        booth: {
          select: { code: true, zone: true },
        },
      },
    },
  } as const;

  let exhibitor = null;
  let searchTargetType = "EXHIBITOR_REFERENCE";
  let searchTargetValue = referenceNumber;

  if (referenceNumber) {
    exhibitor = await prisma.exhibitor.findUnique({
      where: { referenceNumber },
      include: exhibitorInclude,
    });
  } else {
    const byPhone = await prisma.exhibitor.findMany({
      where: { phone },
      orderBy: { createdAt: "asc" },
      take: 2,
      include: exhibitorInclude,
    });

    if (byPhone.length > 1) {
      return NextResponse.json({ error: "PHONE_NOT_UNIQUE" }, { status: 400 });
    }

    exhibitor = byPhone[0] ?? null;
    searchTargetType = "EXHIBITOR_PHONE";
    searchTargetValue = phone;
  }

  if (!exhibitor) {
    await logActivity({
      actor: user,
      actionKey: "EXHIBITOR_SEARCH_NOT_FOUND",
      actionLabel: "Recherche exposant sans resultat",
      module: "EXPOSANTS_API",
      targetType: searchTargetType,
      targetId: searchTargetValue,
      description: "Aucun exposant trouve pour l'identifiant fourni.",
    });
    return NextResponse.json({ error: "Exhibitor not found" }, { status: 404 });
  }

  await logActivity({
    actor: user,
    actionKey: "EXHIBITOR_SEARCH_SUCCESS",
    actionLabel: "Recherche exposant reussie",
    module: "EXPOSANTS_API",
    targetType: "EXHIBITOR",
    targetId: exhibitor.id,
    description: `Consultation de l'exposant ${exhibitor.referenceNumber}.`,
  });

  return NextResponse.json({
    id: exhibitor.id,
    referenceNumber: exhibitor.referenceNumber,
    firstName: exhibitor.firstName,
    lastName: exhibitor.lastName,
    fullName: exhibitor.fullName,
    email: exhibitor.email,
    companyName: exhibitor.companyName,
    phone: exhibitor.phone,
    age: exhibitor.age,
    gender: exhibitor.gender,
    nationality: exhibitor.nationality,
    address: exhibitor.address,
    businessRegister: exhibitor.businessRegister,
    activitySector: exhibitor.activitySector,
    location: exhibitor.location,
    region: exhibitor.region,
    status: exhibitor.status,
    expectedAmount: toNumber(exhibitor.expectedAmount),
    totalPaid: toNumber(exhibitor.totalPaid),
    booth: exhibitor.boothAssignment?.booth ?? null,
  });
}
