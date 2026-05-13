import { ref } from "vue";
import { apiFetch } from "~/utils/apiFetch";
import { useNotify } from "@/composables/useNotify";

type ExportApiBody = {
  data: {
    matrix: (string | number)[][];
    suggestedFileName: string;
  };
};

export type ProjectsExportParams = {
  search: string;
  status: string;
};

export function useProjectsExport() {
  const exporting = ref(false);
  const notify = useNotify();

  const downloadExcel = async (params: ProjectsExportParams) => {
    exporting.value = true;
    try {
      const s = params.search.trim();
      const st = params.status.trim();
      const res = (await apiFetch("/api/projects/export", {
        query: {
          search: s || undefined,
          status:
            st === "active" || st === "closed" || st === "cancelled"
              ? st
              : undefined,
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
      XLSX.utils.book_append_sheet(wb, sheet, "Projects");
      XLSX.writeFile(wb, suggestedFileName || "projects.xlsx");
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
