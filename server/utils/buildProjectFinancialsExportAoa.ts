import {
  pfClientLineTotal,
  pfClientTaxRupiahForDisplay,
  pfPartnerLineTotal,
  pfPartnerTaxRupiahForDisplay,
} from "~/lib/projectFinancialsMath";

/** Baris hasil join untuk export Excel project financials */
export type ProjectFinancialExportRow = {
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
    const flow = r.flowDirection;
    const isIn = flow === "in";
    const isOut = flow === "out";

    const totalPartner = isIn
      ? pfPartnerLineTotal(
          r.qtyPartner,
          r.unitPricePartner,
          r.pph,
          r.taxIn,
        )
      : null;
    const totalClient = isOut
      ? pfClientLineTotal(r.qtyClient, r.unitPriceClient, r.taxOut)
      : null;

    const partnerPphIdr = isIn
      ? pfPartnerTaxRupiahForDisplay(
          r.qtyPartner,
          r.unitPricePartner,
          r.pph,
        )
      : null;
    const partnerPpnIdr = isIn
      ? pfPartnerTaxRupiahForDisplay(
          r.qtyPartner,
          r.unitPricePartner,
          r.taxIn,
        )
      : null;

    const clientPpnIdr = isOut
      ? pfClientTaxRupiahForDisplay(
          r.qtyClient,
          r.unitPriceClient,
          r.taxOut,
        )
      : null;

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
      isIn ? cellStr(r.poNumberPartner) : "",
      isIn ? cellDate(r.poDatePartner) : "",
      isIn ? cellStr(r.invoiceNumberPartner) : "",
      isIn ? cellDate(r.invoiceDatePartner) : "",
      isIn ? cellNum(r.qtyPartner) : "",
      isIn ? cellNum(r.unitPricePartner) : "",
      totalPartner != null && Number.isFinite(totalPartner) ? totalPartner : "",
      partnerPphIdr != null && Number.isFinite(partnerPphIdr)
        ? partnerPphIdr
        : "",
      partnerPpnIdr != null && Number.isFinite(partnerPpnIdr)
        ? partnerPpnIdr
        : "",
      isIn ? cellStr(r.balapNumber) : "",
      isIn ? cellDate(r.balapDate) : "",
      isIn ? cellStr(r.bastNumber) : "",
      isIn ? cellDate(r.bastDate) : "",
      isIn ? cellStr(r.status) : "",
      cellStr(r.note),
      isOut ? cellStr(r.invoiceNumberClient) : "",
      isOut ? cellDate(r.invoiceDateClient) : "",
      isOut ? cellNum(r.qtyClient) : "",
      isOut ? cellNum(r.unitPriceClient) : "",
      totalClient != null && Number.isFinite(totalClient) ? totalClient : "",
      "",
      clientPpnIdr != null && Number.isFinite(clientPpnIdr) ? clientPpnIdr : "",
      isOut ? cellStr(r.balapNumber) : "",
      isOut ? cellDate(r.balapDate) : "",
      isOut ? cellStr(r.bastNumber) : "",
      isOut ? cellDate(r.bastDate) : "",
      isOut ? cellStr(r.status) : "",
      isOut ? cellStr(r.fpNumberClient) : "",
      isOut ? cellDate(r.fpDateClient) : "",
      cellStr(r.clientName),
      cellStr(r.status),
      cellStr(r.note),
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
