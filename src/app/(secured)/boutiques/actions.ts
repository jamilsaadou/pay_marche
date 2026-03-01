"use server";

import { revalidatePath } from "next/cache";

import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";

export async function createBooth(formData: FormData) {
  const user = await requireUser([UserRole.ADMIN]);

  const code = String(formData.get("code") ?? "").trim();
  const zone = String(formData.get("zone") ?? "").trim();

  if (!code) {
    return;
  }

  try {
    const booth = await prisma.booth.create({
      data: {
        code,
        zone: zone || null,
      },
    });

    await logActivity({
      actor: user,
      actionKey: "BOOTH_CREATED",
      actionLabel: "Kiosque cree",
      module: "KIOSQUES",
      targetType: "BOOTH",
      targetId: booth.id,
      description: `Creation du kiosque ${booth.code}.`,
    });
  } catch {
    return;
  }

  revalidatePath("/boutiques");
}

export async function assignBoothToExhibitor(formData: FormData) {
  const user = await requireUser([UserRole.ADMIN]);

  const exhibitorId = String(formData.get("exhibitorId") ?? "").trim();
  const boothId = String(formData.get("boothId") ?? "").trim();

  if (!exhibitorId || !boothId) {
    return;
  }

  const assignment = await prisma.$transaction(async (tx) => {
    const exhibitor = await tx.exhibitor.findUnique({
      where: { id: exhibitorId },
      include: { boothAssignment: true },
    });

    const booth = await tx.booth.findUnique({
      where: { id: boothId },
      include: { assignment: true },
    });

    if (!exhibitor || !booth) {
      return null;
    }

    if (exhibitor.status !== "PAID") {
      return null;
    }

    if (exhibitor.boothAssignment || booth.assignment || !booth.isActive) {
      return null;
    }

    return tx.boothAssignment.create({
      data: {
        exhibitorId,
        boothId,
        assignedById: user.id,
      },
    });
  });

  if (assignment) {
    await logActivity({
      actor: user,
      actionKey: "BOOTH_ASSIGNED",
      actionLabel: "Kiosque attribue",
      module: "KIOSQUES",
      targetType: "BOOTH_ASSIGNMENT",
      targetId: assignment.id,
      description: "Attribution d'un kiosque a un exposant paye.",
      metadata: { exhibitorId, boothId },
    });
  }

  revalidatePath("/boutiques");
  revalidatePath("/exposants");
  revalidatePath("/dashboard");
}
