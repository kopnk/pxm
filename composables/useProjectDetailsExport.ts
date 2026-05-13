import { ref } from "vue";
import { apiFetch } from "~/utils/apiFetch";
import { useNotify } from "@/composables/useNotify";

type ExportApiBody = {
  data: {
    matrix: (string | number)[][];
    suggestedFileName: string;
  };
};

export type ProjectDetailsExportParams = {
  search: string;
  status: string;
  projectId?: string;
  cityKabId?: string;
};

const DETAIL_STATUSES = ["active", "delay", "closed", "cancelled"] as const;

function normalizeStatus(
  s: string,
): (typeof DETAIL_STATUSES)[number] | undefined {
  const t = s.trim();
  return (DETAIL_STATUSES as readonly string[]).includes(t)
    ? (t as (typeof DETAIL_STATUSES)[number])
    : undefined;
}

export function useProjectDetailsExport() {
  const exporting = ref(false);
  const notify = useNotify();

  const downloadExcel = async (params: ProjectDetailsExportParams) => {
    exporting.value = true;
    try {
      const s = params.search.trim();
      const st = normalizeStatus(params.status);
      const pid = (params.projectId ?? "").trim();
      const cid = (params.cityKabId ?? "").trim();

      const res = (await apiFetch("/api/project_details/export", {
        query: {
          search: s || undefined,
          status: st,
          projectId: pid || undefined,
          cityKabId: cid || undefined,
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
      XLSX.utils.book_append_sheet(wb, sheet, "Project details");
      XLSX.writeFile(wb, suggestedFileName || "project-details.xlsx");
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
