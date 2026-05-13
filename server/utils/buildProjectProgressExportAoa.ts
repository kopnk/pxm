/**
 * Matrix export Excel Project Progress (baris = site progress terfilter).
 * Tanggal per stage: YYYY-MM-DD; cocokkan kode stage di JSON secara case-insensitive.
 */

export type ProgressExportStageCell = {
  plan_submit_date?: string | null;
  actual_approve_date?: string | null;
};

export type ProjectProgressExportRow = {
  contractNumber?: string | null;
  poNumber?: string | null;
  poDate?: string | null;
  deliveryDate?: string | null;
  komDate?: string | null;
  projectName?: string | null;
  regionName?: string | null;
  subRegionName?: string | null;
  cityKabName?: string | null;
  materialId?: string | null;
  materialName?: string | null;
  lineNumber?: number | null;
  neId?: string | null;
  systemkey?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  picArea?: string | null;
  remarksProjectsDetails?: string | null;
  remarksDelay?: string | null;
  partnerName?: string | null;
  detailStatus?: string | null;
  stageData?: Record<string, ProgressExportStageCell> | null;
};

export const PROJECT_PROGRESS_EXPORT_HEADERS: string[] = [
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
  "pic",
  "remaks project",
  "partner name",
  "CAF Plan",
  "CAF Actual",
  "Permit Plan",
  "Permit Actual",
  "RFI Plan",
  "RFI Actual",
  "ATP Plan",
  "ATP Actual",
  "Endorse Plan",
  "Endorse Actual",
  "Delay",
  "Delay remaks/note",
  "Balap/Baut Plan",
  "Balap/Baut Actual",
  "BAST plan",
  "BAST Actual",
  "So Delivery plan",
  "So delivery Actual",
  "Invoice Plan",
  "Invoice Actual",
  "Paid Plan",
  "Paid Actual",
  "Accrued Plan",
  "Accrued Actual",
];

function cellStr(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v);
}

function cellDate(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v).slice(0, 10);
}

function cellNum(v: unknown): string | number {
  if (v == null || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

function pickStage(
  sd: Record<string, ProgressExportStageCell>,
  matchers: RegExp[],
): ProgressExportStageCell | undefined {
  for (const k of Object.keys(sd)) {
    if (matchers.some((m) => m.test(k))) return sd[k];
  }
  return undefined;
}

function planActual(
  sd: Record<string, ProgressExportStageCell>,
  matchers: RegExp[],
): [string, string] {
  const s = pickStage(sd, matchers);
  return [cellDate(s?.plan_submit_date), cellDate(s?.actual_approve_date)];
}

function buildStageFlatCells(
  sd: Record<string, ProgressExportStageCell>,
  remarksDelay: string | null | undefined,
  detailStatus: string | null | undefined,
): string[] {
  const out: string[] = [];

  const pairs: RegExp[][] = [
    [/^caf$/i],
    [/^permit$/i],
    [/^rfi$/i],
    [/^atp$/i],
    [/^endorse/i],
  ];
  for (const m of pairs) {
    const [p, a] = planActual(sd, m);
    out.push(p, a);
  }

  const delaySt = pickStage(sd, [/^delay$/i]);
  const delayCol =
    cellDate(delaySt?.plan_submit_date) ||
    (String(detailStatus ?? "").toLowerCase() === "delay" ? "delay" : "");
  const delayNoteParts = [
    cellDate(delaySt?.actual_approve_date),
    remarksDelay?.trim() || "",
  ].filter(Boolean);
  out.push(delayCol, delayNoteParts.join(" | "));

  const tailPairs: RegExp[][] = [
    [/balap|baut|balap_baut/i],
    [/^bast$/i],
    [/so[_\s-]*delivery/i],
    [/^invoice$/i],
    [/^paid$/i],
    [/^accru/i],
  ];
  for (const m of tailPairs) {
    const [p, a] = planActual(sd, m);
    out.push(p, a);
  }

  return out;
}

export function buildProjectProgressExportAoa(
  rows: ProjectProgressExportRow[],
): (string | number)[][] {
  const aoa: (string | number)[][] = [PROJECT_PROGRESS_EXPORT_HEADERS];
  const expected = PROJECT_PROGRESS_EXPORT_HEADERS.length;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const sd = (r.stageData ?? {}) as Record<string, ProgressExportStageCell>;
    const stageCells = buildStageFlatCells(
      sd,
      r.remarksDelay,
      r.detailStatus,
    );

    const row: (string | number)[] = [
      i + 1,
      cellStr(r.contractNumber),
      cellStr(r.poNumber),
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
      cellStr(r.picArea),
      cellStr(r.remarksProjectsDetails),
      cellStr(r.partnerName),
      ...stageCells,
    ];

    if (row.length !== expected) {
      throw new Error(
        `Project progress export column mismatch: ${row.length} vs ${expected}`,
      );
    }
    aoa.push(row);
  }

  return aoa;
}
