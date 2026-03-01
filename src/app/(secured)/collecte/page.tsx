import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { formatCurrency, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { FaCashRegister, FaTable } from "react-icons/fa";

export const dynamic = "force-dynamic";

export default async function CollectePage() {
  const user = await requireUser([UserRole.ADMIN, UserRole.COLLECTOR]);

  const paymentWhere = user.role === UserRole.ADMIN ? {} : { collectorId: user.id };
  const collectorWhere = user.role === UserRole.ADMIN ? { role: UserRole.COLLECTOR } : { id: user.id };

  const [
    expectedAggregate,
    paidAggregate,
    pendingExhibitors,
    partialExhibitors,
    paidExhibitors,
    recentPayments,
    collectors,
    groupedByCollector,
  ] = await Promise.all([
    prisma.exhibitor.aggregate({ _sum: { expectedAmount: true } }),
    prisma.payment.aggregate({ where: paymentWhere, _sum: { amount: true } }),
    prisma.exhibitor.count({ where: { status: "PENDING" } }),
    prisma.exhibitor.count({ where: { status: "PARTIAL" } }),
    prisma.exhibitor.count({ where: { status: "PAID" } }),
    prisma.payment.findMany({
      where: paymentWhere,
      orderBy: { paidAt: "desc" },
      take: 20,
      include: {
        exhibitor: {
          select: {
            referenceNumber: true,
            fullName: true,
          },
        },
        collector: {
          select: {
            fullName: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: collectorWhere,
      select: {
        id: true,
        fullName: true,
        email: true,
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.payment.groupBy({
      by: ["collectorId"],
      where: paymentWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const expectedTotal = toNumber(expectedAggregate._sum.expectedAmount ?? 0);
  const collectedTotal = toNumber(paidAggregate._sum.amount ?? 0);
  const remainingTotal = Math.max(expectedTotal - collectedTotal, 0);
  const rate = expectedTotal > 0 ? Math.min(100, (collectedTotal / expectedTotal) * 100) : 0;

  const groupedMap = new Map(
    groupedByCollector.map((row) => [
      row.collectorId,
      {
        count: row._count._all,
        sum: toNumber(row._sum.amount ?? 0),
      },
    ]),
  );

  const collectionSituation = collectors.map((collector) => {
    const stats = groupedMap.get(collector.id);

    return {
      ...collector,
      payments: stats?.count ?? 0,
      amount: stats?.sum ?? 0,
    };
  });

  return (
    <section className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3">
          <span className="icon-badge">
            <FaCashRegister />
          </span>
          <h1 className="font-serif text-3xl font-semibold gradient-text">Situation de collecte</h1>
        </div>
        <p className="mt-2 text-sm text-zinc-700">
          La collecte n&apos;est pas saisie ici. Les paiements sont enregistres via l&apos;API, pour ton application mobile collecteur.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="glass-card p-5">
          <p className="text-sm text-zinc-700">Montant attendu</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(expectedTotal)}</p>
        </article>
        <article className="glass-card p-5">
          <p className="text-sm text-zinc-700">Montant collecte</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(collectedTotal)}</p>
        </article>
        <article className="glass-card p-5">
          <p className="text-sm text-zinc-700">Reste a collecter</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(remainingTotal)}</p>
        </article>
        <article className="glass-card p-5">
          <p className="text-sm text-zinc-700">Progression</p>
          <p className="mt-2 text-2xl font-semibold">{rate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-zinc-600">
            {paidExhibitors} payes • {partialExhibitors} partiels • {pendingExhibitors} en attente
          </p>
        </article>
      </div>

      <div className="grid gap-4">
        <article className="glass-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FaTable className="text-accent-600" />
            Situation par utilisateur collecteur
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-zinc-600">
                  <th className="pb-2">Collecteur</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Nb paiements</th>
                  <th className="pb-2">Montant collecte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/35">
                {collectionSituation.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-zinc-600">
                      Aucun collecteur trouve.
                    </td>
                  </tr>
                ) : (
                  collectionSituation.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-4">{item.fullName}</td>
                      <td className="py-3 pr-4">{item.email}</td>
                      <td className="py-3 pr-4">{item.payments}</td>
                      <td className="py-3">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article className="glass-card p-6">
        <h2 className="text-lg font-semibold">Derniers paiements enregistres via API</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-zinc-600">
                <th className="pb-2">Date</th>
                <th className="pb-2">Reference</th>
                <th className="pb-2">Exposant</th>
                <th className="pb-2">Collecteur</th>
                <th className="pb-2">Mode</th>
                <th className="pb-2">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/35">
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-zinc-600">
                    Aucun paiement pour le moment.
                  </td>
                </tr>
              ) : (
                recentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-3 pr-4">{new Date(payment.paidAt).toLocaleString("fr-FR")}</td>
                    <td className="py-3 pr-4">{payment.exhibitor.referenceNumber}</td>
                    <td className="py-3 pr-4">{payment.exhibitor.fullName}</td>
                    <td className="py-3 pr-4">{payment.collector.fullName}</td>
                    <td className="py-3 pr-4">{payment.method}</td>
                    <td className="py-3">{formatCurrency(toNumber(payment.amount))}</td>
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
