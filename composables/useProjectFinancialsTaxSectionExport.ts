import { apiFetch } from "~/utils/apiFetch";
import { useProjectFinancialsStore } from "@/stores/projectFinancials";
import { useExcelMatrixExport } from "@/composables/useExcelMatrixExport";
import { normalizeFinancialStatus } from "@/utils/exportFilters";

const ENDPOINTS = {
  "tax-in": "/api/project_financials/export-tax-in",
  "tax-out": "/api/project_financials/export-tax-out",
  pph: "/api/project_financials/export-pph",
} as const;

export type ProjectFinancialsTaxSectionExportKey = keyof typeof ENDPOINTS;

const SHEET_NAMES: Record<ProjectFinancialsTaxSectionExportKey, string> = {
  "tax-in": "Tax in",
  "tax-out": "Tax out",
  pph: "PPH",
};

export function useProjectFinancialsTaxSectionExport(
  section: ProjectFinancialsTaxSectionExportKey,
) {
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
        const st = normalizeFinancialStatus(
          params?.status ?? store.filters.status,
        );
        return apiFetch(ENDPOINTS[section], {
          query: {
            search: s || undefined,
            status: st,
            page: params?.page ?? store.page,
            limit: params?.limit ?? store.limit,
          },
        });
      },
      {
        sheetName: SHEET_NAMES[section],
        fallbackFileName: `project-financials-${section}.xlsx`,
      },
    );

  return { exporting, downloadExcel };
}
