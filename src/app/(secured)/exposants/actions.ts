"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import { configDecimalToNumber, getSystemConfig } from "@/lib/system-config";

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

export async function createExhibitor(formData: FormData) {
  const user = await requireUser([UserRole.ADMIN]);

  const referenceNumber = String(formData.get("referenceNumber") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const expectedAmountRaw = normalizeAmount(String(formData.get("expectedAmount") ?? "0"));
  const systemConfig = await getSystemConfig();
  const defaultExpectedAmount = configDecimalToNumber(systemConfig.defaultExpectedAmount);
  const expectedAmount = Number.isFinite(expectedAmountRaw) && expectedAmountRaw > 0 ? expectedAmountRaw : defaultExpectedAmount;

  if (!referenceNumber || !fullName || !Number.isFinite(expectedAmount) || expectedAmount < 0) {
    return;
  }

  try {
    const exhibitor = await prisma.exhibitor.create({
      data: {
        referenceNumber,
        fullName,
        companyName: companyName || null,
        phone: phone || null,
        expectedAmount,
      },
    });

    await logActivity({
      actor: user,
      actionKey: "EXHIBITOR_CREATED",
      actionLabel: "Exposant cree",
      module: "EXPOSANTS",
      targetType: "EXHIBITOR",
      targetId: exhibitor.id,
      description: `Creation manuelle de l'exposant ${exhibitor.referenceNumber}.`,
    });
  } catch {
    return;
  }

  revalidatePath("/exposants");
  revalidatePath("/dashboard");
}

export async function importExhibitors(formData: FormData) {
  const user = await requireUser([UserRole.ADMIN]);
  const systemConfig = await getSystemConfig();
  const defaultExpectedAmount = configDecimalToNumber(systemConfig.defaultExpectedAmount);

  const file = formData.get("excelFile");
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

  const toText = (value: unknown) => String(value ?? "").trim();
  const toAmount = (value: unknown) => {
    const text = toText(value);
    if (!text) {
      return 0;
    }

    const amount = normalizeAmount(text);
    return Number.isFinite(amount) ? amount : 0;
  };
  const toAge = (value: unknown) => {
    const text = toText(value);
    if (!text) {
      return null;
    }

    const age = Number(text);
    if (!Number.isFinite(age) || age <= 0) {
      return null;
    }

    return Math.floor(age);
  };

  const data = rows
    .map((row) => {
      const referenceNumber = toText(getValue(row, ["N° Référence", "Reference", "Numero", "ID"]));
      const firstName = toText(getValue(row, ["Prenom", "Prénom", "First Name"]));
      const lastName = toText(getValue(row, ["Nom", "Last Name"]));
      const fullName = `${firstName} ${lastName}`.trim();
      const email = toText(getValue(row, ["Email", "E-mail"]));
      const phone = toText(getValue(row, ["Telephone", "Téléphone", "Phone", "Contact"]));
      const age = toAge(getValue(row, ["Age", "Âge"]));
      const gender = toText(getValue(row, ["Sexe", "Genre", "Gender"]));
      const nationality = toText(getValue(row, ["Nationalite", "Nationalité", "Nationality"]));
      const address = toText(getValue(row, ["Adresse", "Address"]));
      const companyName = toText(getValue(row, ["Entreprise", "Societe", "Société", "Company", "Structure"]));
      const businessRegister = toText(getValue(row, ["Registre Commerce", "RCCM", "Registre"]));
      const activitySector = toText(getValue(row, ["Secteur d activite", "Secteur", "Activite", "Activity Sector"]));
      const location = toText(getValue(row, ["Localisation", "Ville", "Location"]));
      const region = toText(getValue(row, ["Region", "Région"]));
      const importedExpectedAmount = toAmount(
        getValue(row, ["Montant attendu", "Montant", "Amount", "A payer", "Attendu", "Montant a payer"]),
      );
      const expectedAmount = importedExpectedAmount > 0 ? importedExpectedAmount : defaultExpectedAmount;

      if (!referenceNumber || !fullName) {
        return null;
      }

      return {
        referenceNumber,
        firstName: firstName || null,
        lastName: lastName || null,
        fullName,
        email: email || null,
        expectedAmount,
        phone: phone || null,
        age,
        gender: gender || null,
        nationality: nationality || null,
        address: address || null,
        companyName: companyName || null,
        businessRegister: businessRegister || null,
        activitySector: activitySector || null,
        location: location || null,
        region: region || null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (data.length === 0) {
    return;
  }

  await prisma.exhibitor.createMany({
    data,
    skipDuplicates: true,
  });

  await logActivity({
    actor: user,
    actionKey: "EXHIBITOR_IMPORT_EXCEL",
    actionLabel: "Import Excel des exposants",
    module: "PARAMETRES",
    targetType: "EXHIBITOR",
    description: `${data.length} exposants importes depuis un fichier Excel.`,
    metadata: { importedCount: data.length, defaultExpectedAmount },
  });

  revalidatePath("/exposants");
  revalidatePath("/dashboard");
}
