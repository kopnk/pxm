const FINANCIAL_STATUSES = [
  "draft",
  "issued",
  "approved",
  "paid",
  "cancelled",
] as const;

const FLOW_DIRECTIONS = ["in", "out"] as const;

export type ProjectFinancialsListFilterInput = {
  projectId?: string;
  projectDetailId?: string;
  search?: string;
  status?: string;
  flowDirection?: string;
  taxSection?: "taxIn" | "taxOut" | "pph";
};

export type ProjectFinancialsFilterRecord = {
  projectId?: string | null;
  projectDetailId?: string | null;
  flowDirection?: string | null;
  status?: string | null;
  projectName?: string | null;
  projectPoNumber?: string | null;
  detailMaterialName?: string | null;
  detailSystemkey?: string | null;
  detailSiteId?: string | null;
  detailSiteName?: string | null;
  clientName?: string | null;
  partnerName?: string | null;
  bastNumber?: string | null;
  balapNumber?: string | null;
  invoiceNumberPartner?: string | null;
  invoiceNumberClient?: string | null;
  poNumberPartner?: string | null;
  poNumberClient?: string | null;
  fpNumberPartner?: string | null;
  fpNumberClient?: string | null;
  vbNumber?: string | null;
  mcmNumber?: string | null;
  paidNumber?: string | null;
  docNumber?: string | null;
  qtyPartner?: unknown;
  unitPricePartner?: unknown;
  qtyClient?: unknown;
  unitPriceClient?: unknown;
  taxIn?: unknown;
  taxOut?: unknown;
  pph?: unknown;
  stage?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  totalPrice?: unknown;
  balapDate?: string | null;
  bastDate?: string | null;
  docDate?: string | null;
  vbDate?: string | null;
  mcmDate?: string | null;
  paidDate?: string | null;
  poDatePartner?: string | null;
  poDateClient?: string | null;
  invoiceDatePartner?: string | null;
  invoiceDateClient?: string | null;
  fpDatePartner?: string | null;
  fpDateClient?: string | null;
};

function buildFinancialSearchHaystack(record: ProjectFinancialsFilterRecord) {
  return [
    record.bastNumber,
    record.balapNumber,
    record.invoiceNumberPartner,
    record.invoiceNumberClient,
    record.poNumberPartner,
    record.poNumberClient,
    record.fpNumberPartner,
    record.fpNumberClient,
    record.vbNumber,
    record.mcmNumber,
    record.paidNumber,
    record.docNumber,
    record.projectPoNumber,
    record.projectName,
    record.detailMaterialName,
    record.detailSiteName,
    record.detailSystemkey,
    record.detailSiteId,
    record.partnerName,
    record.clientName,
    record.qtyPartner,
    record.unitPricePartner,
    record.qtyClient,
    record.unitPriceClient,
    record.taxIn,
    record.taxOut,
    record.pph,
    record.stage,
    record.quantity,
    record.unitPrice,
    record.totalPrice,
    record.balapDate,
    record.bastDate,
    record.docDate,
    record.vbDate,
    record.mcmDate,
    record.paidDate,
    record.poDatePartner,
    record.poDateClient,
    record.invoiceDatePartner,
    record.invoiceDateClient,
    record.fpDatePartner,
    record.fpDateClient,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesProjectFinancialsListFilters(
  record: ProjectFinancialsFilterRecord,
  input: ProjectFinancialsListFilterInput,
) {
  if (input.projectId && record.projectId !== input.projectId) {
    return false;
  }

  if (input.projectDetailId && record.projectDetailId !== input.projectDetailId) {
    return false;
  }

  if (input.status) {
    const status = input.status.trim();
    if (
      (FINANCIAL_STATUSES as readonly string[]).includes(status) &&
      record.status !== status
    ) {
      return false;
    }
  }

  if (input.flowDirection) {
    const flowDirection = input.flowDirection.trim();
    if (
      (FLOW_DIRECTIONS as readonly string[]).includes(flowDirection) &&
      record.flowDirection !== flowDirection
    ) {
      return false;
    }
  }

  if (input.taxSection === "taxIn") {
    if (record.flowDirection !== "in" || Number(record.taxIn ?? 0) <= 0) {
      return false;
    }
  }

  if (input.taxSection === "taxOut") {
    if (record.flowDirection !== "out" || Number(record.taxOut ?? 0) <= 0) {
      return false;
    }
  }

  if (input.taxSection === "pph") {
    if (record.flowDirection !== "in" || Number(record.pph ?? 0) <= 0) {
      return false;
    }
  }

  if (input.search?.trim()) {
    const search = input.search.trim().toLowerCase();
    if (!buildFinancialSearchHaystack(record).includes(search)) {
      return false;
    }
  }

  return true;
}
