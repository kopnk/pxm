export type ProjectListFilterRecord = {
  projectName: string;
  poNumber: string;
  prScNumber: string;
  contractNumber: string | null;
  pm: string | null;
  status: string;
  clientName?: string | null;
  poDate?: string | null;
  deliveryDate?: string | null;
  komDate?: string | null;
  subTotal?: number | null;
  discount?: number | null;
  netPrice?: number | null;
  vatRate?: number | null;
  vatAmount?: number | null;
  grandTotal?: number | null;
};

export type ProjectsListFilterInput = {
  search?: string;
  status?: string;
};

function buildProjectSearchHaystack(project: ProjectListFilterRecord) {
  return [
    project.projectName,
    project.poNumber,
    project.prScNumber,
    project.contractNumber ?? "",
    project.pm ?? "",
    project.status,
    project.clientName ?? "",
    project.poDate ?? "",
    project.deliveryDate ?? "",
    project.komDate ?? "",
    project.subTotal ?? "",
    project.discount ?? "",
    project.netPrice ?? "",
    project.vatRate ?? "",
    project.vatAmount ?? "",
    project.grandTotal ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesProjectsListFilters(
  project: ProjectListFilterRecord,
  input: ProjectsListFilterInput,
) {
  const search = input.search?.trim().toLowerCase();
  const status = input.status?.trim().toLowerCase();

  if (status && String(project.status).trim().toLowerCase() !== status) {
    return false;
  }

  if (search && !buildProjectSearchHaystack(project).includes(search)) {
    return false;
  }

  return true;
}
