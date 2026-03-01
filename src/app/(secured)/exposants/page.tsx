import Link from "next/link";

import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { FaFileExport, FaFileImport, FaUsers } from "react-icons/fa";

import { createExhibitor } from "./actions";
import { ExhibitorsTable } from "./exhibitors-table";
import { NewExhibitorModal } from "./new-exhibitor-modal";

export const dynamic = "force-dynamic";

export default async function ExhibitorsPage() {
  await requireUser([UserRole.ADMIN]);

  const exhibitors = await prisma.exhibitor.findMany({
    include: {
      boothAssignment: {
        include: {
          booth: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const normalizedExhibitors = exhibitors.map((exhibitor) => ({
    id: exhibitor.id,
    referenceNumber: exhibitor.referenceNumber,
    fullName: exhibitor.fullName,
    firstName: exhibitor.firstName,
    lastName: exhibitor.lastName,
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
    expectedAmount: toNumber(exhibitor.expectedAmount),
    totalPaid: toNumber(exhibitor.totalPaid),
    status: exhibitor.status,
    boothCode: exhibitor.boothAssignment?.booth.code ?? null,
    boothZone: exhibitor.boothAssignment?.booth.zone ?? null,
    createdAt: exhibitor.createdAt.toISOString(),
  }));

  return (
    <section className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="icon-badge">
                <FaUsers />
              </span>
              <h1 className="font-serif text-3xl font-semibold gradient-text">Exposants</h1>
            </div>
            <p className="mt-1 text-sm text-zinc-700">Creation unitaire, import en lot et suivi du statut de paiement.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <NewExhibitorModal action={createExhibitor} />
            <a href="/api/exports/exposants-payes" className="btn btn-secondary flex items-center gap-2">
              <FaFileExport />
              Exporter les payes (Excel)
            </a>
            <Link href="/parametres" className="btn btn-secondary flex items-center gap-2">
              <FaFileImport />
              Imports (Parametres)
            </Link>
          </div>
        </div>
      </div>

      <article className="glass-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FaUsers className="text-accent-600" />
          Liste des exposants
        </h2>
        <ExhibitorsTable exhibitors={normalizedExhibitors} />
      </article>
    </section>
  );
}
