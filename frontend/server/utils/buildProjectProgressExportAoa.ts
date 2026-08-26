import { cellDate, cellNum, cellStr } from "~/server/utils/exportCellHelpers";

/**
 * Matrix export Excel Project Progress (baris = site progress terfilter).
 * Tanggal per stage: YYYY-MM-DD; cocokkan kode stage di JSON secara case-insensitive.
 */

export type ProgressExportStageCell = {
  plan_submit_date?: string | null;
  actual_approve_date?: string | null;
  remarks?: string | null;
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

const BASE_HEADERS = [
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
] as const;

type StageExportDefinition = {
  label: string;
  matchers: RegExp[];
  mergeDetailDelayRemarks?: boolean;
};

const STAGE_EXPORT_DEFINITIONS: StageExportDefinition[] = [
  { label: "CAF", matchers: [/^caf$/i] },
  { label: "Permit", matchers: [/^permit$/i] },
  { label: "RFI", matchers: [/^rfi$/i] },
  { label: "ATP", matchers: [/^atp$/i] },
  { label: "Endorse", matchers: [/^endorse/i] },
  {
    label: "Delay",
    matchers: [/^delay$/i],
    mergeDetailDelayRemarks: true,
  },
  { label: "Balap/Baut", matchers: [/balap|baut|balap_baut/i] },
  { label: "BAST", matchers: [/^bast$/i] },
  { label: "So Delivery", matchers: [/so[_\s-]*delivery/i] },
  { label: "Invoice", matchers: [/^invoice$/i] },
  { label: "Paid", matchers: [/^paid$/i] },
  { label: "Accrued", matchers: [/^accru/i] },
];

export const PROJECT_PROGRESS_EXPORT_HEADERS = [
  ...BASE_HEADERS,
  ...STAGE_EXPORT_DEFINITIONS.flatMap(({ label }) => [
    `${label} Plan`,
    `${label} Actual`,
    `${label} Remarks`,
  ]),
];

function pickStage(
  sd: Record<string, ProgressExportStageCell>,
  matchers: RegExp[],
): ProgressExportStageCell | undefined {
  for (const k of Object.keys(sd)) {
    if (matchers.some((m) => m.test(k))) return sd[k];
  }
  return undefined;
}

function buildStageFlatCells(
  sd: Record<string, ProgressExportStageCell>,
  remarksDelay: string | null | undefined,
  detailStatus: string | null | undefined,
): string[] {
  return STAGE_EXPORT_DEFINITIONS.flatMap((definition) => {
    const stage = pickStage(sd, definition.matchers);
    const isDelay = definition.mergeDetailDelayRemarks;
    const plan =
      cellDate(stage?.plan_submit_date) ||
      (isDelay && String(detailStatus ?? "").toLowerCase() === "delay"
        ? "delay"
        : "");
    const remarks = [
      stage?.remarks?.trim() || "",
      isDelay ? remarksDelay?.trim() || "" : "",
    ].filter(Boolean);

    return [plan, cellDate(stage?.actual_approve_date), remarks.join(" | ")];
  });
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
