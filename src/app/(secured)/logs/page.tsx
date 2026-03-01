import { FaClipboardList } from "react-icons/fa";

import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  await requireUser([UserRole.ADMIN]);

  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const summaryMap = new Map<string, { actionLabel: string; count: number }>();
  for (const log of logs) {
    const existing = summaryMap.get(log.actionKey);
    if (existing) {
      existing.count += 1;
    } else {
      summaryMap.set(log.actionKey, {
        actionLabel: log.actionLabel,
        count: 1,
      });
    }
  }

  const summary = Array.from(summaryMap.entries())
    .map(([actionKey, value]) => ({
      actionKey,
      actionLabel: value.actionLabel,
      count: value.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <section className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3">
          <span className="icon-badge">
            <FaClipboardList />
          </span>
          <h1 className="font-serif text-3xl font-semibold gradient-text">Logs systeme</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-700">Journal des activites avec noms d&apos;actions explicites.</p>
      </div>

      <article className="glass-card p-6">
        <h2 className="text-lg font-semibold">Actions les plus frequentes</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.length === 0 ? (
            <p className="text-sm text-zinc-600">Aucune activite enregistree.</p>
          ) : (
            summary.map((item) => (
              <span key={item.actionKey} className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 text-sm">
                <span className="font-medium">{item.actionLabel}</span>
                <span className="status-chip status-partial">{item.count}</span>
              </span>
            ))
          )}
        </div>
      </article>

      <article className="glass-card p-6">
        <h2 className="text-lg font-semibold">Historique detaille</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-zinc-600">
                <th className="pb-2">Date</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Module</th>
                <th className="pb-2">Acteur</th>
                <th className="pb-2">Description</th>
                <th className="pb-2">Cible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/35">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-zinc-600">
                    Aucun log pour le moment.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 pr-4">{new Date(log.createdAt).toLocaleString("fr-FR")}</td>
                    <td className="py-3 pr-4">
                      <div className="font-semibold">{log.actionLabel}</div>
                      <div className="text-xs text-zinc-500">{log.actionKey}</div>
                    </td>
                    <td className="py-3 pr-4">{log.module ?? "-"}</td>
                    <td className="py-3 pr-4">
                      <div>{log.actorName ?? "Systeme"}</div>
                      <div className="text-xs text-zinc-500">{log.actorEmail ?? "-"}</div>
                    </td>
                    <td className="py-3 pr-4">{log.description ?? "-"}</td>
                    <td className="py-3">{[log.targetType, log.targetId].filter(Boolean).join(" / ") || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
