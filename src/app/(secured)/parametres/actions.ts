"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

import { UserRole } from "@/generated/prisma/enums";
import { importExhibitors } from "@/app/(secured)/exposants/actions";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";

function normalizeAmount(raw: string) {
  return Number(raw.replace(/\s/g, "").replace(",", "."));
}

function normalizeHeader(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseBoolean(raw: unknown) {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) {
    return true;
  }

  return ["1", "true", "oui", "yes", "actif", "active"].includes(text);
}

export async function updateAmountConfig(formData: FormData) {
  const user = await requireUser([UserRole.ADMIN]);

  const defaultExpectedAmount = normalizeAmount(String(formData.get("defaultExpectedAmount") ?? "0"));
  const minPaymentAmount = normalizeAmount(String(formData.get("minPaymentAmount") ?? "0"));
  const maxPaymentAmount = normalizeAmount(String(formData.get("maxPaymentAmount") ?? "0"));
  const allowPartialPayments = formData.get("allowPartialPayments") === "on";

  if (
    !Number.isFinite(defaultExpectedAmount) ||
    !Number.isFinite(minPaymentAmount) ||
    !Number.isFinite(maxPaymentAmount) ||
    defaultExpectedAmount < 0 ||
    minPaymentAmount < 0 ||
    maxPaymentAmount < minPaymentAmount
  ) {
    return;
  }

  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {
      defaultExpectedAmount,
      minPaymentAmount,
      maxPaymentAmount,
      allowPartialPayments,
    },
    create: {
      id: 1,
      defaultExpectedAmount,
      minPaymentAmount,
      maxPaymentAmount,
      allowPartialPayments,
    },
  });

  await logActivity({
    actor: user,
    actionKey: "SETTINGS_AMOUNT_UPDATED",
    actionLabel: "Configuration des montants mise a jour",
    module: "PARAMETRES",
    description: "Mise a jour des montants par defaut et bornes de paiement.",
    metadata: {
      defaultExpectedAmount,
      minPaymentAmount,
      maxPaymentAmount,
      allowPartialPayments,
    },
  });

  revalidatePath("/parametres");
  revalidatePath("/collecte");
  revalidatePath("/dashboard");
}

export async function importExhibitorsFromSettings(formData: FormData) {
  await importExhibitors(formData);
  revalidatePath("/parametres");
}

export async function importBoothsFromSettings(formData: FormData) {
  const user = await requireUser([UserRole.ADMIN]);

  const file = formData.get("boothExcelFile");
  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return;
  }

  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length === 0) {
    return;
  }

  const getValue = (row: Record<string, unknown>, aliases: string[]) => {
    const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
    const entry = Object.entries(row).find(([key]) => {
      const normalizedKey = normalizeHeader(key);
      return normalizedAliases.some((alias) => normalizedKey.includes(alias));
    });

    return entry?.[1];
  };

  const data = rows
    .map((row) => {
      const code = String(getValue(row, ["Code", "Code kiosque", "Kiosque", "Stand", "Booth"]) ?? "").trim();
      const zone = String(getValue(row, ["Zone", "Secteur"]) ?? "").trim();
      const isActive = parseBoolean(getValue(row, ["Actif", "Active", "Disponible"]));

      if (!code) {
        return null;
      }

      return {
        code,
        zone: zone || null,
        isActive,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (data.length === 0) {
    return;
  }

  await prisma.booth.createMany({
    data,
    skipDuplicates: true,
  });

  await logActivity({
    actor: user,
    actionKey: "BOOTH_IMPORT_EXCEL",
    actionLabel: "Import Excel des kiosques",
    module: "PARAMETRES",
    targetType: "BOOTH",
    description: `${data.length} kiosques importes depuis un fichier Excel.`,
    metadata: { importedCount: data.length },
  });

  revalidatePath("/parametres");
  revalidatePath("/boutiques");
  revalidatePath("/dashboard");
}
