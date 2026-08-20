export type ProjectDetailsFilterRecord = {
  systemkey: string | null;
  neId: string | null;
  materialName: string | null;
  materialId: string | null;
  siteId: string | null;
  siteName: string | null;
  picArea: string | null;
  uom: string | null;
  status: string | null;
  remarksProjectsDetails: string | null;
  remarksDelay: string | null;
  remarksCancel: string | null;
  projectName: string | null;
  poNumber: string | null;
  cityKabName: string | null;
  subRegionName: string | null;
  regionName: string | null;
  lineNumber: number | null;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  taxOut: number | null;
  projectId: string | null;
  cityKabId: string | null;
};

export type ProjectDetailsListFilterInput = {
  search?: string;
  projectId?: string;
  status?: string;
  cityKabId?: string;
};

function buildProjectDetailsSearchHaystack(record: ProjectDetailsFilterRecord) {
  return [
    record.systemkey ?? "",
    record.neId ?? "",
    record.materialName ?? "",
    record.materialId ?? "",
    record.siteId ?? "",
    record.siteName ?? "",
    record.picArea ?? "",
    record.uom ?? "",
    record.status ?? "",
    record.remarksProjectsDetails ?? "",
    record.remarksDelay ?? "",
    record.remarksCancel ?? "",
    record.projectName ?? "",
    record.poNumber ?? "",
    record.cityKabName ?? "",
    record.subRegionName ?? "",
    record.regionName ?? "",
    record.lineNumber ?? "",
    record.quantity ?? "",
    record.unitPrice ?? "",
    record.totalPrice ?? "",
    record.taxOut ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesProjectDetailsListFilters(
  record: ProjectDetailsFilterRecord,
  input: ProjectDetailsListFilterInput,
) {
  const search = input.search?.trim().toLowerCase();
  const projectId = input.projectId?.trim();
  const status = input.status?.trim().toLowerCase();
  const cityKabId = input.cityKabId?.trim();

  if (projectId && record.projectId !== projectId) {
    return false;
  }

  if (status && String(record.status ?? "").trim().toLowerCase() !== status) {
    return false;
  }

  if (cityKabId && record.cityKabId !== cityKabId) {
    return false;
  }

  if (search && !buildProjectDetailsSearchHaystack(record).includes(search)) {
    return false;
  }

  return true;
}
