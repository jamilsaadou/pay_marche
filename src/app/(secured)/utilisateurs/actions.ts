"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";

export async function createUser(formData: FormData) {
  const actor = await requireUser([UserRole.ADMIN]);

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? UserRole.COLLECTOR).trim();
  const role = roleRaw === UserRole.ADMIN ? UserRole.ADMIN : UserRole.COLLECTOR;

  if (!fullName || !email || password.length < 6) {
    return;
  }

  const passwordHash = await hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role,
      },
    });

    await logActivity({
      actor,
      actionKey: "USER_CREATED",
      actionLabel: "Utilisateur cree",
      module: "UTILISATEURS",
      targetType: "USER",
      targetId: user.id,
      description: `Creation d'un utilisateur ${user.email} (${user.role}).`,
    });
  } catch {
    return;
  }

  revalidatePath("/utilisateurs");
  revalidatePath("/collecte");
}

export async function toggleCollectorStatus(formData: FormData) {
  const actor = await requireUser([UserRole.ADMIN]);

  const userId = String(formData.get("userId") ?? "").trim();
  const nextActiveRaw = String(formData.get("nextActive") ?? "").trim();
  const nextActive = nextActiveRaw === "true";

  if (!userId) {
    return;
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!target || target.role !== UserRole.COLLECTOR || target.id === actor.id) {
    return;
  }

  if (target.isActive === nextActive) {
    return;
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { isActive: nextActive },
    select: {
      id: true,
      email: true,
      isActive: true,
    },
  });

  await logActivity({
    actor,
    actionKey: updated.isActive ? "COLLECTOR_ENABLED" : "COLLECTOR_DISABLED",
    actionLabel: updated.isActive ? "Collecteur active" : "Collecteur desactive",
    module: "UTILISATEURS",
    targetType: "USER",
    targetId: updated.id,
    description: `${updated.email} a ete ${updated.isActive ? "reactive" : "desactive"}.`,
    metadata: {
      userId: updated.id,
      email: updated.email,
      isActive: updated.isActive,
    },
  });

  revalidatePath("/utilisateurs");
  revalidatePath("/collecte");
}
