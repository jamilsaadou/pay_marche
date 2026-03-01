"use client";

import { useMemo, useRef, useState } from "react";
import { FaEye, FaFilter, FaTimes } from "react-icons/fa";

import { formatCurrency } from "@/lib/format";

type ExhibitorStatus = "PENDING" | "PARTIAL" | "PAID";

type ExhibitorRow = {
  id: string;
  referenceNumber: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  companyName: string | null;
  phone: string | null;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  address: string | null;
  businessRegister: string | null;
  activitySector: string | null;
  location: string | null;
  region: string | null;
  expectedAmount: number;
  totalPaid: number;
  status: ExhibitorStatus;
  boothCode: string | null;
  boothZone: string | null;
  createdAt: string;
};

type ExhibitorsTableProps = {
  exhibitors: ExhibitorRow[];
};

const statusLabel: Record<ExhibitorStatus, string> = {
  PENDING: "En attente",
  PARTIAL: "Partiel",
  PAID: "Paye",
};

const statusClassName: Record<ExhibitorStatus, string> = {
  PENDING: "status-chip status-pending",
  PARTIAL: "status-chip status-partial",
  PAID: "status-chip status-paid",
};

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

export function ExhibitorsTable({ exhibitors }: ExhibitorsTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ExhibitorStatus>("ALL");
  const [selected, setSelected] = useState<ExhibitorRow | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const filteredExhibitors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return exhibitors.filter((item) => {
      const statusOk = statusFilter === "ALL" || item.status === statusFilter;
      if (!statusOk) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        item.referenceNumber,
        item.fullName,
        item.phone ?? "",
        item.companyName ?? "",
        item.email ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [exhibitors, query, statusFilter]);

  function openDetails(exhibitor: ExhibitorRow) {
    setSelected(exhibitor);
    dialogRef.current?.showModal();
  }

  function closeDetails() {
    dialogRef.current?.close();
    setSelected(null);
  }

  return (
    <>
      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_220px_auto]">
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher: reference, nom, telephone, entreprise..."
        />
        <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | ExhibitorStatus)}>
          <option value="ALL">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="PARTIAL">Partiel</option>
          <option value="PAID">Paye</option>
        </select>
        <div className="glass-soft flex items-center justify-center gap-2 px-3 py-2 text-sm text-zinc-700">
          <FaFilter className="text-primary-600" />
          {filteredExhibitors.length} / {exhibitors.length}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-zinc-600">
              <th className="pb-2">Reference</th>
              <th className="pb-2">Exposant</th>
              <th className="pb-2">Contact</th>
              <th className="pb-2">Attendu</th>
              <th className="pb-2">Paye</th>
              <th className="pb-2">Reste</th>
              <th className="pb-2">Statut</th>
              <th className="pb-2">Boutique</th>
              <th className="pb-2 text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/35">
            {filteredExhibitors.length === 0 ? (
              <tr>
                <td className="py-3 text-zinc-600" colSpan={9}>
                  Aucun exposant ne correspond au filtre.
                </td>
              </tr>
            ) : (
              filteredExhibitors.map((exhibitor) => {
                const remaining = Math.max(exhibitor.expectedAmount - exhibitor.totalPaid, 0);

                return (
                  <tr key={exhibitor.id}>
                    <td className="py-3 pr-4 font-semibold">{exhibitor.referenceNumber}</td>
                    <td className="py-3 pr-4">{exhibitor.fullName}</td>
                    <td className="py-3 pr-4">{displayValue(exhibitor.phone ?? exhibitor.email)}</td>
                    <td className="py-3 pr-4">{formatCurrency(exhibitor.expectedAmount)}</td>
                    <td className="py-3 pr-4">{formatCurrency(exhibitor.totalPaid)}</td>
                    <td className="py-3 pr-4">{formatCurrency(remaining)}</td>
                    <td className="py-3 pr-4">
                      <span className={statusClassName[exhibitor.status]}>{statusLabel[exhibitor.status]}</span>
                    </td>
                    <td className="py-3 pr-4">
                      {exhibitor.boothCode ? (
                        <span className="font-medium">{exhibitor.boothCode}</span>
                      ) : (
                        <span className="text-zinc-600">Non attribuee</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button type="button" className="btn btn-secondary inline-flex items-center gap-2" onClick={() => openDetails(exhibitor)}>
                        <FaEye />
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <dialog ref={dialogRef} className="modal-shell modal-shell-lg">
        <article className="modal-panel glass-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">{selected?.fullName ?? "Detail exposant"}</h3>
              <p className="mt-1 text-sm text-zinc-600">{selected?.referenceNumber ?? ""}</p>
            </div>
            <button type="button" className="btn btn-secondary inline-flex items-center gap-2 px-3" onClick={closeDetails}>
              <FaTimes />
            </button>
          </div>

          {selected ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Prenom</p>
                <p className="font-medium">{displayValue(selected.firstName)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Nom</p>
                <p className="font-medium">{displayValue(selected.lastName)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Email</p>
                <p className="font-medium">{displayValue(selected.email)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Telephone</p>
                <p className="font-medium">{displayValue(selected.phone)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Entreprise</p>
                <p className="font-medium">{displayValue(selected.companyName)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Registre commerce</p>
                <p className="font-medium">{displayValue(selected.businessRegister)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Age</p>
                <p className="font-medium">{displayValue(selected.age)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Sexe</p>
                <p className="font-medium">{displayValue(selected.gender)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Nationalite</p>
                <p className="font-medium">{displayValue(selected.nationality)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Adresse</p>
                <p className="font-medium">{displayValue(selected.address)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Secteur d&apos;activite</p>
                <p className="font-medium">{displayValue(selected.activitySector)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Localisation / Region</p>
                <p className="font-medium">
                  {displayValue(selected.location)} / {displayValue(selected.region)}
                </p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Montant attendu</p>
                <p className="font-medium">{formatCurrency(selected.expectedAmount)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Montant paye</p>
                <p className="font-medium">{formatCurrency(selected.totalPaid)}</p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Statut</p>
                <span className={statusClassName[selected.status]}>{statusLabel[selected.status]}</span>
              </div>
              <div className="glass-soft px-3 py-2 text-sm">
                <p className="text-zinc-500">Boutique</p>
                <p className="font-medium">
                  {displayValue(selected.boothCode)} {selected.boothZone ? `(${selected.boothZone})` : ""}
                </p>
              </div>
              <div className="glass-soft px-3 py-2 text-sm sm:col-span-2">
                <p className="text-zinc-500">Date de creation</p>
                <p className="font-medium">{new Date(selected.createdAt).toLocaleString("fr-FR")}</p>
              </div>
            </div>
          ) : null}
        </article>
      </dialog>
    </>
  );
}
