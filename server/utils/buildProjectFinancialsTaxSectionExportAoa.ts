import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { projectFinancials } from "~/server/db/schema/project_financials";
import {
  pfClientTaxRupiahForDisplay,
  pfFormatIdDate,
  pfListLineBase,
  pfPartnerTaxRupiahForDisplay,
} from "~/lib/projectFinancialsMath";

export type ProjectFinancialTaxSectionKind = "taxIn" | "taxOut" | "pph";

export type ProjectFinancialTaxSectionExportRow = {
  flowDirection: string | null;
  taxIn: unknown;
  taxOut: unknown;
  pph: unknown;
  qtyPartner: unknown;
  unitPricePartner: unknown;
  qtyClient: unknown;
  unitPriceClient: unknown;
  docNumber: string | null;
  docDate: unknown;
  invoiceNumberPartner: string | null;
  invoiceDatePartner: unknown;
  invoiceNumberClient: string | null;
  invoiceDateClient: unknown;
  partnerNpwp: string | null;
  partnerName: string | null;
  partnerAddressText: string | null;
  partnerAddressMeta: unknown;
  clientNpwp: string | null;
  clientName: string | null;
  clientAddressText: string | null;
  clientAddressMeta: unknown;
  projectName: string | null;
  projectPoNumber: string | null;
  detailMaterialName: string | null;
  detailSiteName: string | null;
  detailSiteId: string | null;
  detailSystemkey: string | null;
};

/** Filter baris = sama logika filter di halaman tax-in / tax-out / pph. */
export function projectFinancialsTaxSectionKindWhere(
  kind: ProjectFinancialTaxSectionKind,
): SQL {
  if (kind === "taxIn") {
    return sql`(
      ${projectFinancials.flowDirection} = 'in'
      AND ${projectFinancials.taxIn} IS NOT NULL
      AND (${projectFinancials.taxIn})::numeric > 0
    )`;
  }
  if (kind === "taxOut") {
    return sql`(
      ${projectFinancials.flowDirection} = 'out'
      AND ${projectFinancials.taxOut} IS NOT NULL
      AND (${projectFinancials.taxOut})::numeric > 0
    )`;
  }
  return sql`(
    ${projectFinancials.flowDirection} = 'in'
    AND ${projectFinancials.pph} IS NOT NULL
    AND (${projectFinancials.pph})::numeric > 0
  )`;
}

function cityFromAddressMeta(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  const city = (meta as { city?: unknown }).city;
  return typeof city === "string" ? city.trim() : "";
}

function cellStr(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v);
}

function journalBillPaidDate(
  kind: ProjectFinancialTaxSectionKind,
  r: ProjectFinancialTaxSectionExportRow,
): string {
  const doc = (r.docNumber ?? "").trim();
  if (kind === "taxOut") {
    const inv = (r.invoiceNumberClient ?? "").trim();
    const journal = doc || inv;
    const raw = r.docDate ?? r.invoiceDateClient;
    const d = pfFormatIdDate(raw);
    const datePart = d === "—" ? "" : d;
    return [journal, datePart].filter(Boolean).join(" | ");
  }
  const inv = (r.invoiceNumberPartner ?? "").trim();
  const journal = doc || inv;
  const raw = r.docDate ?? r.invoiceDatePartner;
  const d = pfFormatIdDate(raw);
  const datePart = d === "—" ? "" : d;
  return [journal, datePart].filter(Boolean).join(" | ");
}

function descriptionCell(r: ProjectFinancialTaxSectionExportRow): string {
  const a = [r.projectName, r.projectPoNumber].filter(Boolean).join(" ").trim();
  const b = [r.detailMaterialName, r.detailSiteName].filter(Boolean).join(" ").trim();
  const c = [r.detailSiteId, r.detailSystemkey].filter(Boolean).join(" ").trim();
  return [a, b, c].filter(Boolean).join(" | ");
}

const HEADERS: Record<
  ProjectFinancialTaxSectionKind,
  readonly string[]
> = {
  taxIn: [
    "No",
    "NPWP",
    "Name",
    "Address",
    "City",
    "Dpp",
    "Tax In",
    "No Journal/Bill Paid Date",
    "Description",
  ],
  taxOut: [
    "No",
    "NPWP",
    "Name",
    "Address",
    "City",
    "Dpp",
    "Tax Out",
    "No Journal/Bill Paid Date",
    "Description",
  ],
  pph: [
    "No",
    "NPWP",
    "Name",
    "Address",
    "City",
    "Dpp",
    "Pph",
    "No Journal/Bill Paid Date",
    "Description",
  ],
};

export function buildProjectFinancialsTaxSectionExportAoa(
  kind: ProjectFinancialTaxSectionKind,
  rows: ProjectFinancialTaxSectionExportRow[],
): (string | number)[][] {
  const headers = [...HEADERS[kind]];
  const aoa: (string | number)[][] = [headers];
  const expected = headers.length;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const isOut = kind === "taxOut";
    const npwp = isOut ? r.clientNpwp : r.partnerNpwp;
    const name = isOut ? r.clientName : r.partnerName;
    const address = isOut ? r.clientAddressText : r.partnerAddressText;
    const meta = isOut ? r.clientAddressMeta : r.partnerAddressMeta;
    const dppBase = isOut
      ? pfListLineBase(r.qtyClient, r.unitPriceClient)
      : pfListLineBase(r.qtyPartner, r.unitPricePartner);
    const dppVal: number | string =
      dppBase == null || !Number.isFinite(dppBase) ? "" : dppBase;

    let taxVal: number | string = "";
    if (kind === "taxIn") {
      const v = pfPartnerTaxRupiahForDisplay(
        r.qtyPartner,
        r.unitPricePartner,
        r.taxIn,
      );
      taxVal = v == null || !Number.isFinite(v) ? "" : v;
    } else if (kind === "taxOut") {
      const v = pfClientTaxRupiahForDisplay(
        r.qtyClient,
        r.unitPriceClient,
        r.taxOut,
      );
      taxVal = v == null || !Number.isFinite(v) ? "" : v;
    } else {
      const v = pfPartnerTaxRupiahForDisplay(
        r.qtyPartner,
        r.unitPricePartner,
        r.pph,
      );
      taxVal = v == null || !Number.isFinite(v) ? "" : v;
    }

    const row: (string | number)[] = [
      i + 1,
      cellStr(npwp),
      cellStr(name),
      cellStr(address),
      cityFromAddressMeta(meta),
      dppVal,
      taxVal,
      journalBillPaidDate(kind, r),
      descriptionCell(r),
    ];

    if (row.length !== expected) {
      throw new Error(
        `Tax section export column mismatch (${kind}): ${row.length} vs ${expected}`,
      );
    }
    aoa.push(row);
  }

  return aoa;
}
