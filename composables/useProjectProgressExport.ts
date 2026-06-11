import { apiFetch } from "~/utils/apiFetch";
import { useProjectProgressStore } from "@/stores/projectProgress";
import { useExcelMatrixExport } from "@/composables/useExcelMatrixExport";

export type ProjectProgressExportParams = {
  search: string;
  stage: string;
  stageDateType: string;
  status: string;
  project?: string;
  detail?: string;
  page?: number;
  limit?: number;
};

export function useProjectProgressExport() {
  const store = useProjectProgressStore();
  const { exporting, runExport } = useExcelMatrixExport();

  const downloadExcel = (params: ProjectProgressExportParams) =>
    runExport(
      async () => {
        const s = params.search.trim();
        const stg = params.stage.trim();
        const dateType = params.stageDateType.trim();
        const st = params.status.trim();
        const proj = (params.project ?? "").trim();
        const det = (params.detail ?? "").trim();
        return apiFetch("/api/project_progress/export", {
          query: {
            search: s || undefined,
            stage: stg || undefined,
            stageDateType:
              dateType === "planned" || dateType === "actual"
                ? dateType
                : undefined,
            status: st || undefined,
            project: proj || undefined,
            detail: det || undefined,
            page: params.page ?? store.page,
            limit: params.limit ?? store.limit,
          },
        });
      },
      {
        sheetName: "Project progress",
        fallbackFileName: "project-progress.xlsx",
      },
    );

  return { exporting, downloadExcel };
}
