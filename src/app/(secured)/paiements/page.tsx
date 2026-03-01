import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { formatCurrency, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { FaFileExport, FaFileInvoiceDollar, FaMoneyBillWave } from "react-icons/fa";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const user = await requireUser([UserRole.ADMIN, UserRole.COLLECTOR]);

  const where = user.role === UserRole.ADMIN ? {} : { collectorId: user.id };

  const [payments, aggregate] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        exhibitor: {
          select: {
            fullName: true,
            referenceNumber: true,
          },
        },
        collector: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: 200,
    }),
    prisma.payment.aggregate({
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const totalCollected = toNumber(aggregate._sum.amount ?? 0);

  return (
    <section className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="icon-badge">
              <FaFileInvoiceDollar />
            </span>
            <h1 className="font-serif text-3xl font-semibold gradient-text">Paiements</h1>
          </div>
          <a href="/api/exports/paiements" className="btn btn-secondary inline-flex items-center gap-2">
            <FaFileExport />
            Exporter les paiements (Excel)
          </a>
        </div>
        <p className="mt-1 text-sm text-zinc-700">
          {user.role === UserRole.ADMIN
            ? "Historique complet de tous les paiements enregistres."
            : "Historique des paiements que tu as collectes."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="glass-card p-5">
          <FaFileInvoiceDollar className="text-primary-600" />
          <p className="text-sm text-zinc-700">Nombre de paiements</p>
          <p className="mt-2 text-3xl font-semibold">{aggregate._count._all}</p>
        </article>
        <article className="glass-card p-5">
          <FaMoneyBillWave className="text-accent-600" />
          <p className="text-sm text-zinc-700">Montant total collecte</p>
          <p className="mt-2 text-3xl font-semibold">{formatCurrency(totalCollected)}</p>
        </article>
      </div>

      <article className="glass-card p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-zinc-600">
                <th className="pb-2">Date</th>
                <th className="pb-2">Reference</th>
                <th className="pb-2">Exposant</th>
                <th className="pb-2">Collecteur</th>
                <th className="pb-2">Mode</th>
                <th className="pb-2">Montant</th>
                <th className="pb-2">Ref. transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/35">
              {payments.length === 0 ? (
                <tr>
                  <td className="py-3 text-zinc-600" colSpan={7}>
                    Aucun paiement enregistre.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-3 pr-4">{new Date(payment.paidAt).toLocaleString("fr-FR")}</td>
                    <td className="py-3 pr-4 font-semibold">{payment.exhibitor.referenceNumber}</td>
                    <td className="py-3 pr-4">{payment.exhibitor.fullName}</td>
                    <td className="py-3 pr-4">{payment.collector.fullName}</td>
                    <td className="py-3 pr-4">{payment.method}</td>
                    <td className="py-3 pr-4">{formatCurrency(toNumber(payment.amount))}</td>
                    <td className="py-3">{payment.reference ?? "-"}</td>
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
