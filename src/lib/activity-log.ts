import { prisma } from "@/lib/prisma";

type ActorInfo = {
  id?: string | null;
  fullName?: string | null;
  email?: string | null;
};

type LogActivityInput = {
  actor?: ActorInfo | null;
  actionKey: string;
  actionLabel: string;
  module?: string;
  targetType?: string;
  targetId?: string;
  description?: string;
  metadata?: unknown;
};

export async function logActivity(input: LogActivityInput) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: input.actor?.id ?? null,
        actorName: input.actor?.fullName ?? null,
        actorEmail: input.actor?.email ?? null,
        actionKey: input.actionKey,
        actionLabel: input.actionLabel,
        module: input.module ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        description: input.description ?? null,
        metadata: (input.metadata as never) ?? null,
      },
    });
  } catch {
    // Intentionally silent to avoid blocking business actions.
  }
}
