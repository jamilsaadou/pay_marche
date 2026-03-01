import { FaPlusCircle, FaPowerOff, FaUserShield, FaUsers } from "react-icons/fa";

import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { formatCurrency, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

import { createUser, toggleCollectorStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireUser([UserRole.ADMIN]);

  const [users, groupedPayments] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.payment.groupBy({
      by: ["collectorId"],
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const groupedMap = new Map(
    groupedPayments.map((row) => [
      row.collectorId,
      {
        count: row._count._all,
        sum: toNumber(row._sum.amount ?? 0),
      },
    ]),
  );

  return (
    <section className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3">
          <span className="icon-badge">
            <FaUserShield />
          </span>
          <h1 className="font-serif text-3xl font-semibold gradient-text">Gestion des utilisateurs</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-700">Administration des comptes et des roles (Admin / Collecteur).</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <article className="glass-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FaPlusCircle className="text-primary-600" />
            Nouvel utilisateur
          </h2>
          <form action={createUser} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nom complet</label>
              <input name="fullName" className="field" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input name="email" type="email" className="field" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Role</label>
              <select name="role" className="field" defaultValue={UserRole.COLLECTOR}>
                <option value={UserRole.COLLECTOR}>Collecteur</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Mot de passe initial</label>
              <input name="password" type="password" className="field" required minLength={6} />
            </div>
            <button className="btn btn-primary w-full" type="submit">
              Creer l&apos;utilisateur
            </button>
          </form>
        </article>

        <article className="glass-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FaUsers className="text-accent-600" />
            Liste des utilisateurs
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-zinc-600">
                  <th className="pb-2">Nom</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Statut</th>
                  <th className="pb-2">Nb paiements</th>
                  <th className="pb-2">Montant collecte</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/35">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-3 text-zinc-600">
                      Aucun utilisateur enregistre.
                    </td>
                  </tr>
                ) : (
                  users.map((item) => {
                    const stats = groupedMap.get(item.id);
                    const paymentCount = stats?.count ?? 0;
                    const paymentAmount = stats?.sum ?? 0;

                    return (
                      <tr key={item.id}>
                        <td className="py-3 pr-4">{item.fullName}</td>
                        <td className="py-3 pr-4">{item.email}</td>
                        <td className="py-3 pr-4">
                          <span className={item.role === UserRole.ADMIN ? "status-chip status-partial" : "status-chip status-paid"}>
                            {item.role}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={item.isActive ? "status-chip status-paid" : "status-chip status-pending"}>
                            {item.isActive ? "Actif" : "Desactive"}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{item.role === UserRole.COLLECTOR ? paymentCount : "-"}</td>
                        <td className="py-3 pr-4">{item.role === UserRole.COLLECTOR ? formatCurrency(paymentAmount) : "-"}</td>
                        <td className="py-3 text-right">
                          {item.role === UserRole.COLLECTOR ? (
                            <form action={toggleCollectorStatus}>
                              <input type="hidden" name="userId" value={item.id} />
                              <input type="hidden" name="nextActive" value={item.isActive ? "false" : "true"} />
                              <button type="submit" className="btn btn-secondary inline-flex items-center gap-2">
                                <FaPowerOff />
                                {item.isActive ? "Desactiver" : "Reactiver"}
                              </button>
                            </form>
                          ) : (
                            <span className="text-zinc-500">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
