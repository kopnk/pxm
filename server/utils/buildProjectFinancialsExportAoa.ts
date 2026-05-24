import {
  pfClientLineTotal,
  pfClientTaxRupiahForDisplay,
  pfPartnerLineTotal,
  pfPartnerTaxRupiahForDisplay,
} from "~/lib/projectFinancialsMath";

/** Baris hasil join untuk export Excel project financials */
export type ProjectFinancialExportRow = {
  projectDetailId: string;
  createdAt: string | null;
  flowDirection: string;
  status: string;
  note: string | null;
  taxIn: unknown;
  taxOut: unknown;
  pph: unknown;
  qtyPartner: unknown;
  unitPricePartner: unknown;
  qtyClient: unknown;
  unitPriceClient: unknown;
  poNumberPartner: string | null;
  poDatePartner: string | null;
  invoiceNumberPartner: string | null;
  invoiceDatePartner: string | null;
  poNumberClient: string | null;
  poDateClient: string | null;
  invoiceNumberClient: string | null;
  invoiceDateClient: string | null;
  fpNumberClient: string | null;
  fpDateClient: string | null;
  balapNumber: string | null;
  balapDate: string | null;
  bastNumber: string | null;
  bastDate: string | null;
  vbNumber: string | null;
  vbDate: string | null;
  mcmNumber: string | null;
  mcmDate: string | null;
  paidNumber: string | null;
  paidDate: string | null;
  /** Diisi saat merge: balap/bast untuk kolom client */
  clientBalapNumber?: string | null;
  clientBalapDate?: string | null;
  clientBastNumber?: string | null;
  clientBastDate?: string | null;
  partnerStatus?: string | null;
  partnerNote?: string | null;
  clientStatus?: string | null;
  clientNote?: string | null;
  contractNumber: string | null;
  projectPoNumber: string | null;
  poDate: string | null;
  deliveryDate: string | null;
  komDate: string | null;
  projectName: string | null;
  pm: string | null;
  materialId: string | null;
  materialName: string | null;
  lineNumber: number | null;
  neId: string | null;
  systemkey: string | null;
  siteId: string | null;
  siteName: string | null;
  quantity: unknown;
  uom: string | null;
  unitPrice: unknown;
  totalPrice: unknown;
  detailStatus: string | null;
  picArea: string | null;
  remarksProjectsDetails: string | null;
  remarksDelay: string | null;
  remarksCancel: string | null;
  clientName: string | null;
  regionName: string | null;
  subRegionName: string | null;
  cityKabName: string | null;
};

export const PROJECT_FINANCIALS_EXPORT_HEADERS: string[] = [
  "No",
  "Contract number",
  "Po number(client)",
  "po date",
  "delivery date",
  "kom date",
  "Project Name",
  "region",
  "sub region",
  "city kab",
  "material id",
  "material name",
  "line number",
  "ne id",
  "systemkey",
  "site id",
  "site name",
  "qty",
  "uom",
  "unit price",
  "total price",
  "status",
  "pic",
  "remaks project",
  "po partner",
  "po partner date",
  "partner invoice",
  "partner invoice date",
  "partner qty",
  "partner unit price",
  "total partner price",
  "pph",
  "ppn",
  "balap number partner",
  "balap number partner date",
  "bast number partner",
  "bast number partner date",
  "vb number",
  "vb date",
  "mcm number",
  "mcm date",
  "partner status",
  "note",
  "client invoice",
  "client invoice date",
  "client qty",
  "client unit price",
  "total client price",
  "pph",
  "ppn",
  "balap number client",
  "balap number client date",
  "bast number client",
  "bast number client date",
  "client status",
  "client tax number",
  "client tax date",
  "paid number",
  "paid date",
  "client name",
  "status",
  "note",
];

function cellDate(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v).slice(0, 10);
}

function cellNum(v: unknown): number | string {
  if (v == null || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

function cellStr(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v);
}

function joinRemarks(r: ProjectFinancialExportRow): string {
  const parts = [
    r.remarksProjectsDetails,
    r.remarksDelay,
    r.remarksCancel,
  ]
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean);
  return parts.join(" | ");
}

function picCell(r: ProjectFinancialExportRow): string {
  const a = r.picArea?.trim() || "";
  const b = r.pm?.trim() || "";
  if (a && b) return `${a} / ${b}`;
  return a || b;
}

export function buildProjectFinancialsExportAoa(
  rows: ProjectFinancialExportRow[],
): (string | number)[][] {
  const aoa: (string | number)[][] = [PROJECT_FINANCIALS_EXPORT_HEADERS];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;

    const totalPartner = pfPartnerLineTotal(
      r.qtyPartner,
      r.unitPricePartner,
      r.pph,
      r.taxIn,
    );
    const totalClient = pfClientLineTotal(
      r.qtyClient,
      r.unitPriceClient,
      r.taxOut,
    );

    const partnerPphIdr = pfPartnerTaxRupiahForDisplay(
      r.qtyPartner,
      r.unitPricePartner,
      r.pph,
    );
    const partnerPpnIdr = pfPartnerTaxRupiahForDisplay(
      r.qtyPartner,
      r.unitPricePartner,
      r.taxIn,
    );

    const clientPpnIdr = pfClientTaxRupiahForDisplay(
      r.qtyClient,
      r.unitPriceClient,
      r.taxOut,
    );

    const row: (string | number)[] = [
      i + 1,
      cellStr(r.contractNumber),
      cellStr(r.projectPoNumber),
      cellDate(r.poDate),
      cellDate(r.deliveryDate),
      cellDate(r.komDate),
      cellStr(r.projectName),
      cellStr(r.regionName),
      cellStr(r.subRegionName),
      cellStr(r.cityKabName),
      cellStr(r.materialId),
      cellStr(r.materialName),
      cellNum(r.lineNumber),
      cellStr(r.neId),
      cellStr(r.systemkey),
      cellStr(r.siteId),
      cellStr(r.siteName),
      cellNum(r.quantity),
      cellStr(r.uom),
      cellNum(r.unitPrice),
      cellNum(r.totalPrice),
      cellStr(r.detailStatus),
      picCell(r),
      joinRemarks(r),
      cellStr(r.poNumberPartner),
      cellDate(r.poDatePartner),
      cellStr(r.invoiceNumberPartner),
      cellDate(r.invoiceDatePartner),
      cellNum(r.qtyPartner),
      cellNum(r.unitPricePartner),
      totalPartner != null && Number.isFinite(totalPartner) ? totalPartner : "",
      partnerPphIdr != null && Number.isFinite(partnerPphIdr)
        ? partnerPphIdr
        : "",
      partnerPpnIdr != null && Number.isFinite(partnerPpnIdr)
        ? partnerPpnIdr
        : "",
      cellStr(r.balapNumber),
      cellDate(r.balapDate),
      cellStr(r.bastNumber),
      cellDate(r.bastDate),
      cellStr(r.vbNumber),
      cellDate(r.vbDate),
      cellStr(r.mcmNumber),
      cellDate(r.mcmDate),
      cellStr(r.partnerStatus ?? r.status),
      cellStr(r.partnerNote ?? r.note),
      cellStr(r.invoiceNumberClient),
      cellDate(r.invoiceDateClient),
      cellNum(r.qtyClient),
      cellNum(r.unitPriceClient),
      totalClient != null && Number.isFinite(totalClient) ? totalClient : "",
      "",
      clientPpnIdr != null && Number.isFinite(clientPpnIdr) ? clientPpnIdr : "",
      cellStr(r.clientBalapNumber),
      cellDate(r.clientBalapDate),
      cellStr(r.clientBastNumber),
      cellDate(r.clientBastDate),
      cellStr(r.clientStatus ?? r.status),
      cellStr(r.fpNumberClient),
      cellDate(r.fpDateClient),
      cellStr(r.paidNumber),
      cellDate(r.paidDate),
      cellStr(r.clientName),
      cellStr(r.clientStatus ?? r.status),
      cellStr(r.clientNote ?? r.note),
    ];
    const expected = PROJECT_FINANCIALS_EXPORT_HEADERS.length;
    if (row.length !== expected) {
      throw new Error(
        `Export column mismatch: row has ${row.length}, headers ${expected}`,
      );
    }
    aoa.push(row);
  }

  return aoa;
}
