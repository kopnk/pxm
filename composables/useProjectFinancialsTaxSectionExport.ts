import { ref } from "vue";
import { apiFetch } from "~/utils/apiFetch";
import { useNotify } from "@/composables/useNotify";

type ExportApiBody = {
  data: {
    matrix: (string | number)[][];
    suggestedFileName: string;
  };
};

const ENDPOINTS = {
  "tax-in": "/api/project_financials/export-tax-in",
  "tax-out": "/api/project_financials/export-tax-out",
  pph: "/api/project_financials/export-pph",
} as const;

export type ProjectFinancialsTaxSectionExportKey = keyof typeof ENDPOINTS;

const FINANCIAL_STATUSES = [
  "draft",
  "issued",
  "approved",
  "paid",
  "cancelled",
] as const;

function normalizeFinancialStatus(
  s: string,
): (typeof FINANCIAL_STATUSES)[number] | undefined {
  const t = s.trim();
  return (FINANCIAL_STATUSES as readonly string[]).includes(t)
    ? (t as (typeof FINANCIAL_STATUSES)[number])
    : undefined;
}

export function useProjectFinancialsTaxSectionExport(
  section: ProjectFinancialsTaxSectionExportKey,
) {
  const exporting = ref(false);
  const notify = useNotify();

  const downloadExcel = async (params: { search: string; status: string }) => {
    exporting.value = true;
    try {
      const s = params.search.trim();
      const st = normalizeFinancialStatus(params.status);
      const res = (await apiFetch(ENDPOINTS[section], {
        query: {
          search: s || undefined,
          status: st,
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
      const sheetName =
        section === "tax-in"
          ? "Tax in"
          : section === "tax-out"
            ? "Tax out"
            : "PPH";
      XLSX.utils.book_append_sheet(wb, sheet, sheetName);
      XLSX.writeFile(wb, suggestedFileName || "export.xlsx");
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
