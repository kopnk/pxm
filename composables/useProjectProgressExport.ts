import { ref } from "vue";
import { apiFetch } from "~/utils/apiFetch";
import { useNotify } from "@/composables/useNotify";

type ExportApiBody = {
  data: {
    matrix: (string | number)[][];
    suggestedFileName: string;
  };
};

export type ProjectProgressExportParams = {
  search: string;
  stage: string;
  status: string;
  project?: string;
  detail?: string;
};

export function useProjectProgressExport() {
  const exporting = ref(false);
  const notify = useNotify();

  const downloadExcel = async (params: ProjectProgressExportParams) => {
    exporting.value = true;
    try {
      const s = params.search.trim();
      const stg = params.stage.trim();
      const st = params.status.trim();
      const proj = (params.project ?? "").trim();
      const det = (params.detail ?? "").trim();

      const res = (await apiFetch("/api/project_progress/export", {
        query: {
          search: s || undefined,
          stage: stg || undefined,
          status: st || undefined,
          project: proj || undefined,
          detail: det || undefined,
        },
      })) as ExportApiBody;

      const matrix = res.data?.matrix;
      const suggestedFileName = res.data?.suggestedFileName;
      if (!Array.isArray(matrix) || matrix.length === 0) {
        notify.error("Export returned no data");
        return;
      }

      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.aoa_to_sheet(matrix);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Project progress");
      XLSX.writeFile(wb, suggestedFileName || "project-progress.xlsx");
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string };
      const msg =
        err?.data?.message || err?.message || "Failed to export Excel";
      notify.error(msg);
    } finally {
      exporting.value = false;
    }
  };

  return { exporting, downloadExcel };
}
