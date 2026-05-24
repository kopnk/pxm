import type { ProjectFinancialExportRow } from "~/server/utils/buildProjectFinancialsExportAoa";

function rowSortTime(row: ProjectFinancialExportRow): number {
  if (!row.createdAt) return 0;
  const t = new Date(row.createdAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

function pickNewer(
  current: ProjectFinancialExportRow | null,
  candidate: ProjectFinancialExportRow,
): ProjectFinancialExportRow {
  if (!current) return candidate;
  return rowSortTime(candidate) >= rowSortTime(current) ? candidate : current;
}

/** Satu baris export = satu project detail; kolom partner dari in, kolom client dari out. */
export function mergeProjectFinancialsExportByDetail(
  rows: ProjectFinancialExportRow[],
): ProjectFinancialExportRow[] {
  const buckets = new Map<
    string,
    {
      in: ProjectFinancialExportRow | null;
      out: ProjectFinancialExportRow | null;
      sortTs: number;
    }
  >();

  for (const row of rows) {
    const detailId = row.projectDetailId?.trim();
    if (!detailId) continue;

    let bucket = buckets.get(detailId);
    if (!bucket) {
      bucket = { in: null, out: null, sortTs: 0 };
      buckets.set(detailId, bucket);
    }

    const ts = rowSortTime(row);
    if (ts > bucket.sortTs) bucket.sortTs = ts;

    if (row.flowDirection === "in") {
      bucket.in = pickNewer(bucket.in, row);
    } else if (row.flowDirection === "out") {
      bucket.out = pickNewer(bucket.out, row);
    }
  }

  const sorted = [...buckets.entries()].sort(
    (a, b) => b[1].sortTs - a[1].sortTs,
  );

  return sorted.map(([, bucket]) => toMergedExportRow(bucket.in, bucket.out));
}

function toMergedExportRow(
  inRow: ProjectFinancialExportRow | null,
  outRow: ProjectFinancialExportRow | null,
): ProjectFinancialExportRow {
  const base = inRow ?? outRow!;

  return {
    ...base,
    projectDetailId: base.projectDetailId,
    flowDirection: inRow && outRow ? "merged" : (inRow ? "in" : "out"),

    taxIn: inRow?.taxIn ?? null,
    taxOut: outRow?.taxOut ?? null,
    pph: inRow?.pph ?? null,

    poNumberPartner: inRow?.poNumberPartner ?? null,
    poDatePartner: inRow?.poDatePartner ?? null,
    invoiceNumberPartner: inRow?.invoiceNumberPartner ?? null,
    invoiceDatePartner: inRow?.invoiceDatePartner ?? null,
    qtyPartner: inRow?.qtyPartner ?? null,
    unitPricePartner: inRow?.unitPricePartner ?? null,

    vbNumber: inRow?.vbNumber ?? null,
    vbDate: inRow?.vbDate ?? null,
    mcmNumber: inRow?.mcmNumber ?? null,
    mcmDate: inRow?.mcmDate ?? null,

    balapNumber: inRow?.balapNumber ?? null,
    balapDate: inRow?.balapDate ?? null,
    bastNumber: inRow?.bastNumber ?? null,
    bastDate: inRow?.bastDate ?? null,

    clientBalapNumber: outRow?.balapNumber ?? null,
    clientBalapDate: outRow?.balapDate ?? null,
    clientBastNumber: outRow?.bastNumber ?? null,
    clientBastDate: outRow?.bastDate ?? null,

    partnerStatus: inRow?.status ?? null,
    partnerNote: inRow?.note ?? null,

    poNumberClient: outRow?.poNumberClient ?? null,
    poDateClient: outRow?.poDateClient ?? null,
    invoiceNumberClient: outRow?.invoiceNumberClient ?? null,
    invoiceDateClient: outRow?.invoiceDateClient ?? null,
    fpNumberClient: outRow?.fpNumberClient ?? null,
    fpDateClient: outRow?.fpDateClient ?? null,
    qtyClient: outRow?.qtyClient ?? null,
    unitPriceClient: outRow?.unitPriceClient ?? null,
    paidNumber: outRow?.paidNumber ?? null,
    paidDate: outRow?.paidDate ?? null,

    clientStatus: outRow?.status ?? null,
    clientNote: outRow?.note ?? null,
    clientName: outRow?.clientName ?? inRow?.clientName ?? null,

    status: outRow?.status ?? inRow?.status ?? base.status,
    note: outRow?.note ?? inRow?.note ?? base.note,
  };
}

export function paginateMergedExportRows<T>(
  rows: T[],
  page: number,
  limit: number,
): T[] {
  const safePage = Math.max(page, 1);
  const safeLimit = Math.max(limit, 1);
  const offset = (safePage - 1) * safeLimit;
  return rows.slice(offset, offset + safeLimit);
}
