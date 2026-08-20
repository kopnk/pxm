import { apiFetch } from "~/utils/apiFetch";
import { useProjectFinancialsStore } from "@/stores/projectFinancials";
import { useExcelMatrixExport } from "@/composables/useExcelMatrixExport";

export function useProjectFinancialsExport() {
  const store = useProjectFinancialsStore();
  const { exporting, runExport } = useExcelMatrixExport();

  const downloadExcel = (params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) =>
    runExport(
      async () => {
        const s = (params?.search ?? store.filters.search).trim();
        const st = (params?.status ?? store.filters.status).trim();
        return apiFetch("/api/project_financials/export", {
          query: {
            search: s || undefined,
            status: st || undefined,
            page: params?.page ?? store.page,
            limit: params?.limit ?? store.limit,
          },
        });
      },
      {
        sheetName: "Project financials",
        fallbackFileName: "project-financials.xlsx",
      },
    );

  return { exporting, downloadExcel };
}
