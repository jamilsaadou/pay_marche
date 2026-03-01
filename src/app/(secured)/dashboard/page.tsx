import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { formatCurrency, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { FaChartLine, FaMoneyBillWave, FaStore, FaUsers } from "react-icons/fa";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const monthStartWindow = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const paymentFilter = user.role === UserRole.ADMIN ? {} : { collectorId: user.id };

  const [
    totalExhibitors,
    pendingExhibitors,
    partialExhibitors,
    paidExhibitors,
    expectedAggregate,
    paidAggregate,
    assignedBooths,
    recentPayments,
    monthlyPayments,
  ] = await Promise.all([
    prisma.exhibitor.count(),
    prisma.exhibitor.count({ where: { status: "PENDING" } }),
    prisma.exhibitor.count({ where: { status: "PARTIAL" } }),
    prisma.exhibitor.count({ where: { status: "PAID" } }),
    prisma.exhibitor.aggregate({ _sum: { expectedAmount: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: paymentFilter }),
    prisma.boothAssignment.count(),
    prisma.payment.findMany({
      where: paymentFilter,
      include: {
        exhibitor: {
          select: { fullName: true, referenceNumber: true },
        },
        collector: {
          select: { fullName: true },
        },
      },
      orderBy: { paidAt: "desc" },
      take: 8,
    }),
    prisma.payment.findMany({
      where: {
        ...paymentFilter,
        paidAt: { gte: monthStartWindow },
      },
      select: {
        paidAt: true,
        amount: true,
      },
    }),
  ]);

  const expectedTotal = toNumber(expectedAggregate._sum.expectedAmount ?? 0);
  const collectedTotal = toNumber(paidAggregate._sum.amount ?? 0);
  const completionRate = expectedTotal > 0 ? Math.min(100, (collectedTotal / expectedTotal) * 100) : 0;
  const completionRateSafe = Number(completionRate.toFixed(1));

  const statusChart = [
    { label: "En attente", count: pendingExhibitors, className: "bg-[#fdba74]" },
    { label: "Partiel", count: partialExhibitors, className: "bg-[#93c5fd]" },
    { label: "Paye", count: paidExhibitors, className: "bg-[#86efac]" },
  ];
  const maxStatusCount = Math.max(...statusChart.map((item) => item.count), 1);

  const monthlyBuckets = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`,
      label: monthDate.toLocaleDateString("fr-FR", { month: "short" }),
      amount: 0,
    };
  });
  const monthIndexByKey = new Map(monthlyBuckets.map((bucket, index) => [bucket.key, index]));

  for (const payment of monthlyPayments) {
    const paidAt = new Date(payment.paidAt);
    const key = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, "0")}`;
    const index = monthIndexByKey.get(key);

    if (index !== undefined) {
      monthlyBuckets[index].amount += toNumber(payment.amount);
    }
  }

  const maxMonthlyAmount = Math.max(...monthlyBuckets.map((bucket) => bucket.amount), 1);

  return (
    <section className="space-y-4">
      <div className="glass-card stagger-item p-6" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center gap-3">
          <span className="icon-badge">
            <FaChartLine />
          </span>
          <h1 className="font-serif text-3xl font-semibold gradient-text">Tableau de bord</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-700">
          Vision globale des paiements attendus, collectes effectuees et progression des attributions de boutiques.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="glass-card stagger-item p-5" style={{ animationDelay: "120ms" }}>
          <FaUsers className="text-primary-600" />
          <p className="text-sm text-zinc-700">Exposants</p>
          <p className="mt-2 text-3xl font-semibold">{totalExhibitors}</p>
          <p className="mt-1 text-xs text-zinc-600">{paidExhibitors} payes</p>
        </article>

        <article className="glass-card stagger-item p-5" style={{ animationDelay: "160ms" }}>
          <FaMoneyBillWave className="text-accent-600" />
          <p className="text-sm text-zinc-700">Montant attendu</p>
          <p className="mt-2 text-3xl font-semibold">{formatCurrency(expectedTotal)}</p>
        </article>

        <article className="glass-card stagger-item p-5" style={{ animationDelay: "200ms" }}>
          <FaMoneyBillWave className="text-primary-600" />
          <p className="text-sm text-zinc-700">Montant collecte</p>
          <p className="mt-2 text-3xl font-semibold">{formatCurrency(collectedTotal)}</p>
          <p className="mt-1 text-xs text-zinc-600">{completionRateSafe.toFixed(1)}% de l&apos;objectif</p>
        </article>

        <article className="glass-card stagger-item p-5" style={{ animationDelay: "240ms" }}>
          <FaStore className="text-accent-600" />
          <p className="text-sm text-zinc-700">Boutiques attribuees</p>
          <p className="mt-2 text-3xl font-semibold">{assignedBooths}</p>
          <p className="mt-1 text-xs text-zinc-600">Exposants regles uniquement</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="glass-card stagger-item p-6" style={{ animationDelay: "280ms" }}>
          <h2 className="text-lg font-semibold">Graphique des statuts exposants</h2>
          <div className="mt-4 space-y-4">
            {statusChart.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-green-100/70">
                  <div
                    className={`h-full rounded-full ${item.className}`}
                    style={{ width: item.count === 0 ? "0%" : `${Math.max(6, (item.count / maxStatusCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs text-zinc-600">Total exposants: {totalExhibitors}</p>
          </div>
        </article>

        <article className="glass-card stagger-item p-6" style={{ animationDelay: "320ms" }}>
          <h2 className="text-lg font-semibold">Collecte mensuelle (6 derniers mois)</h2>
          <div className="mt-5 grid h-44 grid-cols-6 items-end gap-3">
            {monthlyBuckets.map((bucket) => (
              <div key={bucket.key} className="flex h-full flex-col items-center justify-end gap-2">
                <div className="w-full rounded-md bg-green-100/80 px-1.5 py-1 text-center text-[10px] text-zinc-700">
                  {bucket.amount > 0 ? formatCurrency(bucket.amount) : "-"}
                </div>
                <div className="flex h-28 w-full items-end rounded-md bg-green-50/80 p-1">
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: bucket.amount === 0 ? "0%" : `${Math.max(8, (bucket.amount / maxMonthlyAmount) * 100)}%`,
                      background: "linear-gradient(180deg, var(--accent-500), var(--primary-600))",
                    }}
                  />
                </div>
                <span className="text-xs uppercase text-zinc-600">{bucket.label}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <article className="glass-card stagger-item p-6" style={{ animationDelay: "360ms" }}>
          <h2 className="text-lg font-semibold">Derniers paiements</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-zinc-600">
                  <th className="pb-2">Exposant</th>
                  <th className="pb-2">Reference</th>
                  <th className="pb-2">Collecteur</th>
                  <th className="pb-2">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/35">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-zinc-600">
                      Aucun paiement enregistre.
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-3 pr-4">{payment.exhibitor.fullName}</td>
                      <td className="py-3 pr-4">{payment.exhibitor.referenceNumber}</td>
                      <td className="py-3 pr-4">{payment.collector.fullName}</td>
                      <td className="py-3">{formatCurrency(toNumber(payment.amount))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="glass-card stagger-item p-6" style={{ animationDelay: "400ms" }}>
          <h2 className="text-lg font-semibold">Objectif de collecte</h2>
          <div className="mt-5 flex items-center justify-center">
            <div
              className="relative grid h-40 w-40 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--primary-600) ${completionRateSafe}%, rgba(220, 252, 231, 0.9) 0)`,
              }}
            >
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white/90 text-center shadow-inner">
                <p className="text-xs text-zinc-600">Progression</p>
                <p className="text-xl font-semibold">{completionRateSafe.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-2 text-sm">
            <div className="glass-soft flex items-center justify-between px-3 py-2">
              <span>Objectif global</span>
              <span className="font-semibold">{formatCurrency(expectedTotal)}</span>
            </div>
            <div className="glass-soft flex items-center justify-between px-3 py-2">
              <span>Collecte actuelle</span>
              <span className="font-semibold">{formatCurrency(collectedTotal)}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
