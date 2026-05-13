export type ProjectListExportRow = {
  projectName: string | null;
  contractNumber: string | null;
  prScNumber: string | null;
  poNumber: string | null;
  poDate: string | null;
  deliveryDate: string | null;
  komDate: string | null;
  pm: string | null;
  clientName: string | null;
  subTotal: unknown;
  discount: unknown;
  netPrice: unknown;
  vatAmount: unknown;
  grandTotal: unknown;
};

export const PROJECTS_EXPORT_HEADERS: string[] = [
  "No",
  "Project Name",
  "Contract number",
  "PR/SC Number",
  "Po number",
  "po date",
  "delivery date",
  "kom date",
  "PM",
  "Client",
  "PO Price",
  "Diskon",
  "Net Price",
  "Tax/VAT Amount",
  "Grand Total",
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

export function buildProjectsExportAoa(
  rows: ProjectListExportRow[],
): (string | number)[][] {
  const aoa: (string | number)[][] = [PROJECTS_EXPORT_HEADERS];
  const expected = PROJECTS_EXPORT_HEADERS.length;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const row: (string | number)[] = [
      i + 1,
      cellStr(r.projectName),
      cellStr(r.contractNumber),
      cellStr(r.prScNumber),
      cellStr(r.poNumber),
      cellDate(r.poDate),
      cellDate(r.deliveryDate),
      cellDate(r.komDate),
      cellStr(r.pm),
      cellStr(r.clientName),
      cellNum(r.subTotal),
      cellNum(r.discount),
      cellNum(r.netPrice),
      cellNum(r.vatAmount),
      cellNum(r.grandTotal),
    ];

    if (row.length !== expected) {
      throw new Error(
        `Projects export column mismatch: ${row.length} vs ${expected}`,
      );
    }
    aoa.push(row);
  }

  return aoa;
}
