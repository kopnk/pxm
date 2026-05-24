import { ref } from "vue";
import { useNotify } from "@/composables/useNotify";

export type ExcelMatrixApiBody = {
  data?: {
    matrix?: (string | number)[][];
    suggestedFileName?: string;
    meta?: { exportedLines?: number };
  };
};

type DownloadOptions = {
  sheetName: string;
  fallbackFileName: string;
};

export function useExcelMatrixExport() {
  const exporting = ref(false);
  const notify = useNotify();

  async function writeMatrixFile(
    res: ExcelMatrixApiBody,
    { sheetName, fallbackFileName }: DownloadOptions,
  ) {
    const matrix = res.data?.matrix;
    const suggestedFileName = res.data?.suggestedFileName;
    const exportedLines = res.data?.meta?.exportedLines;

    if (
      !Array.isArray(matrix) ||
      matrix.length === 0 ||
      (exportedLines !== undefined && exportedLines === 0)
    ) {
      notify.error("Export returned no data");
      return;
    }

    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.aoa_to_sheet(matrix);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    XLSX.writeFile(wb, suggestedFileName || fallbackFileName);
  }

  async function runExport(
    fetchMatrix: () => Promise<ExcelMatrixApiBody>,
    options: DownloadOptions,
  ) {
    exporting.value = true;
    try {
      await writeMatrixFile(await fetchMatrix(), options);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string };
      notify.error(
        err?.data?.message || err?.message || "Failed to export Excel",
      );
    } finally {
      exporting.value = false;
    }
  }

  return { exporting, runExport };
}
