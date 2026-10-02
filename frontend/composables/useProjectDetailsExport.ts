import { apiFetch } from "~/utils/apiFetch";
import { useProjectDetailsStore } from "@/stores/projectDetails";
import { useExcelMatrixExport } from "@/composables/useExcelMatrixExport";
import { normalizeProjectDetailStatus } from "@/utils/exportFilters";

export type ProjectDetailsExportParams = {
  search: string;
  status: string;
  material: string;
  projectId?: string;
  cityKabId?: string;
  regionId?: string;
  subRegionId?: string;
  page?: number;
  limit?: number;
};

export function useProjectDetailsExport() {
  const store = useProjectDetailsStore();
  const { exporting, runExport } = useExcelMatrixExport();

  const downloadExcel = (params: ProjectDetailsExportParams) =>
    runExport(
      async () => {
        const s = params.search.trim();
        const pid = (params.projectId ?? "").trim();
        const cid = (params.cityKabId ?? "").trim();
        return apiFetch("/api/project_details/export", {
          query: {
            search: s || undefined,
            material: params.material.trim() || undefined,
            status: normalizeProjectDetailStatus(params.status),
            projectId: pid || undefined,
            cityKabId: cid || undefined,
            regionId: (params.regionId ?? store.filters.regionId) || undefined,
            subRegionId: (params.subRegionId ?? store.filters.subRegionId) || undefined,
            page: params.page ?? store.page,
            limit: params.limit ?? store.limit,
          },
        });
      },
      {
        sheetName: "Project details",
        fallbackFileName: "project-details.xlsx",
      },
    );

  return { exporting, downloadExcel };
}
