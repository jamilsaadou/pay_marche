import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FaCheckCircle, FaPlusCircle, FaStore } from "react-icons/fa";

import { assignBoothToExhibitor, createBooth } from "./actions";

export const dynamic = "force-dynamic";

export default async function BoothsPage() {
  await requireUser([UserRole.ADMIN]);

  const [booths, paidExhibitors, assignments] = await Promise.all([
    prisma.booth.findMany({
      include: {
        assignment: {
          include: {
            exhibitor: {
              select: { fullName: true, referenceNumber: true },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.exhibitor.findMany({
      where: { status: "PAID", boothAssignment: null },
      orderBy: { fullName: "asc" },
    }),
    prisma.boothAssignment.findMany({
      include: {
        exhibitor: {
          select: { fullName: true, referenceNumber: true },
        },
        booth: {
          select: { code: true, zone: true },
        },
      },
      orderBy: { assignedAt: "desc" },
      take: 40,
    }),
  ]);

  const availableBooths = booths.filter((booth) => booth.isActive && !booth.assignment);

  return (
    <section className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3">
          <span className="icon-badge">
            <FaStore />
          </span>
          <h1 className="font-serif text-3xl font-semibold gradient-text">Attribution des boutiques</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-700">
          Seuls les exposants ayant paye peuvent recevoir une boutique.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="glass-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FaPlusCircle className="text-primary-600" />
            Creer une boutique
          </h2>
          <form action={createBooth} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Code boutique</label>
              <input name="code" className="field" required placeholder="BOUT-A01" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Zone</label>
              <input name="zone" className="field" placeholder="Zone Orange" />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Creer la boutique
            </button>
          </form>
        </article>

        <article className="glass-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FaCheckCircle className="text-accent-600" />
            Attribuer une boutique
          </h2>
          <form action={assignBoothToExhibitor} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Exposant (paye)</label>
              <select name="exhibitorId" className="field" required>
                <option value="">Selectionner un exposant</option>
                {paidExhibitors.map((exhibitor) => (
                  <option key={exhibitor.id} value={exhibitor.id}>
                    {exhibitor.referenceNumber} - {exhibitor.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Boutique disponible</label>
              <select name="boothId" className="field" required>
                <option value="">Selectionner une boutique</option>
                {availableBooths.map((booth) => (
                  <option key={booth.id} value={booth.id}>
                    {booth.code} {booth.zone ? `(${booth.zone})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Attribuer la boutique
            </button>
          </form>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <article className="glass-card p-6">
          <h2 className="text-lg font-semibold">Inventaire boutiques</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {booths.length === 0 ? (
              <li className="text-zinc-600">Aucune boutique creee.</li>
            ) : (
              booths.map((booth) => (
                <li key={booth.id} className="glass-soft flex items-center justify-between px-3 py-2">
                  <span>
                    {booth.code} {booth.zone ? `- ${booth.zone}` : ""}
                  </span>
                  <span className={booth.assignment ? "status-chip status-paid" : "status-chip status-pending"}>
                    {booth.assignment ? "Occupee" : "Disponible"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="glass-card p-6">
          <h2 className="text-lg font-semibold">Dernieres attributions</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-zinc-600">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Boutique</th>
                  <th className="pb-2">Zone</th>
                  <th className="pb-2">Exposant</th>
                  <th className="pb-2">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/35">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 text-zinc-600">
                      Aucune attribution pour le moment.
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="py-3 pr-4">{new Date(assignment.assignedAt).toLocaleString("fr-FR")}</td>
                      <td className="py-3 pr-4 font-semibold">{assignment.booth.code}</td>
                      <td className="py-3 pr-4">{assignment.booth.zone ?? "-"}</td>
                      <td className="py-3 pr-4">{assignment.exhibitor.fullName}</td>
                      <td className="py-3">{assignment.exhibitor.referenceNumber}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
