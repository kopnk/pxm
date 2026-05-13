export type ProjectDetailExportRow = {
  contractNumber?: string | null;
  prScNumber?: string | null;
  poNumber?: string | null;
  poDate?: string | null;
  deliveryDate?: string | null;
  komDate?: string | null;
  projectName?: string | null;
  regionName?: string | null;
  subRegionName?: string | null;
  cityKabName?: string | null;
  lineNumber?: number | null;
  materialId?: string | null;
  materialName?: string | null;
  neId?: string | null;
  systemkey?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  quantity?: unknown;
  uom?: string | null;
  unitPrice?: unknown;
  totalPrice?: unknown;
  picArea?: string | null;
  pm?: string | null;
  remarksProjectsDetails?: string | null;
  remarksDelay?: string | null;
  remarksCancel?: string | null;
  clientName?: string | null;
  status?: string | null;
};

export const PROJECT_DETAILS_EXPORT_HEADERS: string[] = [
  "No",
  "Contract number",
  "PR/SC Number",
  "Po number",
  "po date",
  "delivery date",
  "kom date",
  "Project Name",
  "Region",
  "Sub Region",
  "City Kab",
  "Line",
  "Material Id",
  "Material Name",
  "Ne Id",
  "Systemkey",
  "Site Id",
  "Site Name",
  "Qty",
  "Uom",
  "Unit Price",
  "Total Price",
  "PIC",
  "PM",
  "Remaks project",
  "Remaks delay",
  "Remaks cancel",
  "Client",
  "Status",
];

function cellStr(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v);
}

function cellDate(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v).slice(0, 10);
}

function cellNum(v: unknown): number | string {
  if (v == null || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

export function buildProjectDetailsExportAoa(
  rows: ProjectDetailExportRow[],
): (string | number)[][] {
  const aoa: (string | number)[][] = [PROJECT_DETAILS_EXPORT_HEADERS];
  const expected = PROJECT_DETAILS_EXPORT_HEADERS.length;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const row: (string | number)[] = [
      i + 1,
      cellStr(r.contractNumber),
      cellStr(r.prScNumber),
      cellStr(r.poNumber),
      cellDate(r.poDate),
      cellDate(r.deliveryDate),
      cellDate(r.komDate),
      cellStr(r.projectName),
      cellStr(r.regionName),
      cellStr(r.subRegionName),
      cellStr(r.cityKabName),
      cellNum(r.lineNumber),
      cellStr(r.materialId),
      cellStr(r.materialName),
      cellStr(r.neId),
      cellStr(r.systemkey),
      cellStr(r.siteId),
      cellStr(r.siteName),
      cellNum(r.quantity),
      cellStr(r.uom),
      cellNum(r.unitPrice),
      cellNum(r.totalPrice),
      cellStr(r.picArea),
      cellStr(r.pm),
      cellStr(r.remarksProjectsDetails),
      cellStr(r.remarksDelay),
      cellStr(r.remarksCancel),
      cellStr(r.clientName),
      cellStr(r.status),
    ];

    if (row.length !== expected) {
      throw new Error(
        `Project details export column mismatch: ${row.length} vs ${expected}`,
      );
    }
    aoa.push(row);
  }

  return aoa;
}
