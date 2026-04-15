/**
 * State + payload builder untuk create/update project financial (selaras DB + Zod server).
 * PPH, tax in, tax out di form = persentase dari line base; API menyimpan persen yang sama (2 = 2%).
 * Rupiah untuk list/preview = qty × harga × (persen/100).
 */

/** Partner line: qty × unit price */
export function pfPartnerLineBase(
  qty: number | null | undefined,
  unitPrice: number | null | undefined,
): number | null {
  if (qty == null || unitPrice == null) return null;
  if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return null;
  const b = qty * unitPrice;
  return Number.isFinite(b) && b > 0 ? b : null;
}

/** Client line: qty × unit price */
export function pfClientLineBase(
  qty: number | null | undefined,
  unitPrice: number | null | undefined,
): number | null {
  return pfPartnerLineBase(qty, unitPrice);
}

/** Nilai rupiah dari % terhadap base (4 desimal, selaras kolom numeric tax di DB) */
export function pfAmountFromPercent(
  base: number | null,
  percent: number | null | undefined,
): number | null {
  if (base == null || base <= 0) return null;
  if (percent == null) return null;
  const p = Number(percent);
  if (!Number.isFinite(p)) return null;
  return Math.round((base * p) / 100 * 1e4) / 1e4;
}

/** Persentase tersirat dari nilai rupiah tersimpan (untuk form edit) */
export function pfPercentFromAmount(
  amount: number | null | undefined,
  base: number | null,
): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  if (base == null || base <= 0) return null;
  return Math.round((amount / base) * 100 * 1e6) / 1e6;
}

export type ProjectFinancialFormModel = {
  projectId: string;
  projectDetailId: string;
  flowDirection: "in" | "out";

  docType: string;
  docNumber: string;
  docDate: string | null;
  stage: number | null;
  status: string;
  note: string | null;

  /** FK ke `clients` — kosong = tidak dipilih; nama dari master */
  clientId: string;
  /** FK ke `partners` */
  partnerId: string;

  /** % of partner line base (qty × unit) */
  taxInPercent: number | null;
  /** % of client line base */
  taxOutPercent: number | null;
  /** % of partner line base */
  pphPercent: number | null;

  bastNumber: string;
  bastDate: string | null;
  balapNumber: string;
  balapDate: string | null;

  poNumberPartner: string;
  poDatePartner: string | null;
  invoiceNumberPartner: string;
  invoiceDatePartner: string | null;
  fpNumberPartner: string;
  fpDatePartner: string | null;
  qtyPartner: number | null;
  unitPricePartner: number | null;

  poNumberClient: string;
  poDateClient: string | null;
  invoiceNumberClient: string;
  invoiceDateClient: string | null;
  fpNumberClient: string;
  fpDateClient: string | null;
  qtyClient: number | null;
  unitPriceClient: number | null;
};

export function emptyProjectFinancialForm(): ProjectFinancialFormModel {
  return {
    projectId: "",
    projectDetailId: "",
    flowDirection: "in",
    docType: "invoice",
    docNumber: "",
    docDate: null,
    stage: 1,
    status: "draft",
    note: null,
    clientId: "",
    partnerId: "",
    taxInPercent: null,
    taxOutPercent: null,
    pphPercent: null,
    bastNumber: "",
    bastDate: null,
    balapNumber: "",
    balapDate: null,
    poNumberPartner: "",
    poDatePartner: null,
    invoiceNumberPartner: "",
    invoiceDatePartner: null,
    fpNumberPartner: "",
    fpDatePartner: null,
    qtyPartner: null,
    unitPricePartner: null,
    poNumberClient: "",
    poDateClient: null,
    invoiceNumberClient: "",
    invoiceDateClient: null,
    fpNumberClient: "",
    fpDateClient: null,
    qtyClient: null,
    unitPriceClient: null,
  };
}

function n(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

/** Payload POST/PUT — pph / tax in / tax out disimpan sebagai PERSEN (2 = 2%, 11 = 11%). Rupiah dihitung di list dari qty × harga. */
export function buildProjectFinancialPayload(form: ProjectFinancialFormModel) {
  const isInFlow = form.flowDirection === "in";
  const isOutFlow = form.flowDirection === "out";

  return {
    projectId: form.projectId,
    projectDetailId: form.projectDetailId,
    flowDirection: form.flowDirection,
    status: form.status as
      | "draft"
      | "issued"
      | "approved"
      | "paid"
      | "cancelled",
    docType: form.docType || null,
    docNumber: form.docNumber || null,
    docDate: form.docDate || null,
    taxIn: isInFlow ? n(form.taxInPercent) : null,
    taxOut: isOutFlow ? n(form.taxOutPercent) : null,
    pph: isInFlow ? n(form.pphPercent) : null,
    note: form.note || null,
    stage: form.stage ?? null,

    clientId: isOutFlow && form.clientId.trim() ? form.clientId : null,
    partnerId: isInFlow && form.partnerId.trim() ? form.partnerId : null,

    bastNumber: form.bastNumber || null,
    bastDate: form.bastDate || null,
    balapNumber: form.balapNumber || null,
    balapDate: form.balapDate || null,

    poNumberPartner: isInFlow ? form.poNumberPartner || null : null,
    poDatePartner: isInFlow ? form.poDatePartner || null : null,
    invoiceNumberPartner: isInFlow ? form.invoiceNumberPartner || null : null,
    invoiceDatePartner: isInFlow ? form.invoiceDatePartner || null : null,
    fpNumberPartner: isInFlow ? form.fpNumberPartner || null : null,
    fpDatePartner: isInFlow ? form.fpDatePartner || null : null,
    qtyPartner: isInFlow ? n(form.qtyPartner) : null,
    unitPricePartner: isInFlow ? n(form.unitPricePartner) : null,

    poNumberClient: isOutFlow ? form.poNumberClient || null : null,
    poDateClient: isOutFlow ? form.poDateClient || null : null,
    invoiceNumberClient: isOutFlow ? form.invoiceNumberClient || null : null,
    invoiceDateClient: isOutFlow ? form.invoiceDateClient || null : null,
    fpNumberClient: isOutFlow ? form.fpNumberClient || null : null,
    fpDateClient: isOutFlow ? form.fpDateClient || null : null,
    qtyClient: isOutFlow ? n(form.qtyClient) : null,
    unitPriceClient: isOutFlow ? n(form.unitPriceClient) : null,
  };
}

type ApiFinancialRow = Record<string, unknown>;

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

/** Baris lama: kolom berisi rupiah (>100) → turunkan % untuk input form. Baru: kolom sudah %. */
function percentFieldFromRow(
  raw: number | null,
  lineBase: number | null,
): number | null {
  if (raw === null) return null;
  if (raw > 100) {
    if (lineBase == null || lineBase <= 0) return null;
    return pfPercentFromAmount(raw, lineBase);
  }
  return raw;
}

/** Isi form dari GET /api/project_financials/:id */
export function applyFinancialRowToForm(
  row: ApiFinancialRow,
  form: ProjectFinancialFormModel,
) {
  form.projectId = str(row.projectId);
  form.projectDetailId = str(row.projectDetailId);
  form.flowDirection = row.flowDirection === "out" ? "out" : "in";
  form.status = str(row.status) || "draft";
  form.docType = str(row.docType) || "invoice";
  form.docNumber = str(row.docNumber);
  form.docDate = row.docDate ? str(row.docDate).slice(0, 10) : null;
  form.note = row.note ? str(row.note) : null;
  form.stage = n(row.stage);

  form.clientId = row.clientId ? str(row.clientId) : "";
  form.partnerId = row.partnerId ? str(row.partnerId) : "";

  form.bastNumber = str(row.bastNumber);
  form.bastDate = row.bastDate ? str(row.bastDate).slice(0, 10) : null;
  form.balapNumber = str(row.balapNumber);
  form.balapDate = row.balapDate ? str(row.balapDate).slice(0, 10) : null;

  form.poNumberPartner = str(row.poNumberPartner);
  form.poDatePartner = row.poDatePartner
    ? str(row.poDatePartner).slice(0, 10)
    : null;
  form.invoiceNumberPartner = str(row.invoiceNumberPartner);
  form.invoiceDatePartner = row.invoiceDatePartner
    ? str(row.invoiceDatePartner).slice(0, 10)
    : null;
  form.fpNumberPartner = str(row.fpNumberPartner);
  form.fpDatePartner = row.fpDatePartner
    ? str(row.fpDatePartner).slice(0, 10)
    : null;
  form.qtyPartner = n(row.qtyPartner);
  form.unitPricePartner = n(row.unitPricePartner);

  form.poNumberClient = str(row.poNumberClient);
  form.poDateClient = row.poDateClient
    ? str(row.poDateClient).slice(0, 10)
    : null;
  form.invoiceNumberClient = str(row.invoiceNumberClient);
  form.invoiceDateClient = row.invoiceDateClient
    ? str(row.invoiceDateClient).slice(0, 10)
    : null;
  form.fpNumberClient = str(row.fpNumberClient);
  form.fpDateClient = row.fpDateClient
    ? str(row.fpDateClient).slice(0, 10)
    : null;
  form.qtyClient = n(row.qtyClient);
  form.unitPriceClient = n(row.unitPriceClient);

  const partnerBase = pfPartnerLineBase(form.qtyPartner, form.unitPricePartner);
  const clientBase = pfClientLineBase(form.qtyClient, form.unitPriceClient);

  form.pphPercent = percentFieldFromRow(n(row.pph), partnerBase);
  form.taxInPercent = percentFieldFromRow(n(row.taxIn), partnerBase);
  form.taxOutPercent = percentFieldFromRow(n(row.taxOut), clientBase);
}
