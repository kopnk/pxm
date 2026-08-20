import { apiFetch } from "~/utils/apiFetch";
import { useProjectsStore } from "@/stores/projects";
import { useExcelMatrixExport } from "@/composables/useExcelMatrixExport";
import { normalizeProjectStatus } from "@/utils/exportFilters";

export type ProjectsExportParams = {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export function useProjectsExport() {
  const store = useProjectsStore();
  const { exporting, runExport } = useExcelMatrixExport();

  const downloadExcel = (params?: ProjectsExportParams) =>
    runExport(
      async () => {
        const s = (params?.search ?? store.filters.search).trim();
        const st = normalizeProjectStatus(
          params?.status ?? store.filters.status,
        );
        return apiFetch("/api/projects/export", {
          query: {
            search: s || undefined,
            status: st,
            page: params?.page ?? store.meta.page,
            limit: params?.limit ?? store.meta.limit,
          },
        });
      },
      { sheetName: "Projects", fallbackFileName: "projects.xlsx" },
    );

  return { exporting, downloadExcel };
}
