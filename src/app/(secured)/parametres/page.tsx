import { FaCog, FaFileImport, FaMoneyCheckAlt, FaStore } from "react-icons/fa";

import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { formatCurrency, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSystemConfig } from "@/lib/system-config";

import { importBoothsFromSettings, importExhibitorsFromSettings, updateAmountConfig } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireUser([UserRole.ADMIN]);

  const [config, exhibitorCount, boothCount] = await Promise.all([
    getSystemConfig(),
    prisma.exhibitor.count(),
    prisma.booth.count(),
  ]);

  return (
    <section className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3">
          <span className="icon-badge">
            <FaCog />
          </span>
          <h1 className="font-serif text-3xl font-semibold gradient-text">Parametres</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-700">Configuration de l&apos;application, imports Excel et regles de montant.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="glass-card p-5">
          <p className="text-sm text-zinc-700">Exposants en base</p>
          <p className="mt-2 text-2xl font-semibold">{exhibitorCount}</p>
        </article>
        <article className="glass-card p-5">
          <p className="text-sm text-zinc-700">Kiosques en base</p>
          <p className="mt-2 text-2xl font-semibold">{boothCount}</p>
        </article>
        <article className="glass-card p-5">
          <p className="text-sm text-zinc-700">Montant par defaut</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(toNumber(config.defaultExpectedAmount))}</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="glass-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FaMoneyCheckAlt className="text-primary-600" />
            Configuration des montants
          </h2>

          <form action={updateAmountConfig} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Montant attendu par defaut</label>
              <input
                name="defaultExpectedAmount"
                type="number"
                min="0"
                step="0.01"
                className="field"
                defaultValue={toNumber(config.defaultExpectedAmount)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Montant minimum de paiement</label>
              <input
                name="minPaymentAmount"
                type="number"
                min="0"
                step="0.01"
                className="field"
                defaultValue={toNumber(config.minPaymentAmount)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Montant maximum de paiement</label>
              <input
                name="maxPaymentAmount"
                type="number"
                min="0"
                step="0.01"
                className="field"
                defaultValue={toNumber(config.maxPaymentAmount)}
                required
              />
            </div>
            <label className="glass-soft flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="font-medium">Autoriser les paiements partiels</span>
              <input
                name="allowPartialPayments"
                type="checkbox"
                className="h-4 w-4 accent-green-600"
                defaultChecked={config.allowPartialPayments}
              />
            </label>
            <p className="text-xs text-zinc-600">
              Si desactive, chaque paiement doit regler exactement le reste du montant de l&apos;exposant.
            </p>

            <button type="submit" className="btn btn-primary w-full">
              Enregistrer la configuration
            </button>
          </form>
        </article>

        <article className="glass-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FaFileImport className="text-accent-600" />
            Import Excel des exposants
          </h2>
          <p className="mt-2 text-sm text-zinc-700">
            Colonnes attendues: `N° Référence`, `Prénom`, `Nom`, `Email`, `Téléphone`, `Âge`, `Sexe`, `Nationalité`,
            `Adresse`, `Entreprise`, `Registre Commerce`, `Secteur d&apos;activité`, `Localisation`, `Région`.
          </p>

          <form action={importExhibitorsFromSettings} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Fichier Excel exposants</label>
              <input name="excelFile" type="file" className="field" accept=".xlsx,.xls" required />
            </div>

            <button type="submit" className="btn btn-primary w-full">
              Importer les exposants
            </button>
          </form>
        </article>
      </div>

      <article className="glass-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FaStore className="text-primary-600" />
          Import Excel de la liste des kiosques
        </h2>
        <p className="mt-2 text-sm text-zinc-700">
          Colonnes attendues: `Code` (obligatoire), `Zone` (optionnelle), `Actif` (optionnelle: oui/non, true/false, 1/0).
        </p>

        <form action={importBoothsFromSettings} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Fichier Excel kiosques</label>
            <input name="boothExcelFile" type="file" className="field" accept=".xlsx,.xls" required />
          </div>

          <button type="submit" className="btn btn-primary w-full sm:w-auto">
            Importer les kiosques
          </button>
        </form>
      </article>
    </section>
  );
}
