import { computed, ref, type ComputedRef } from "vue";
import { useProgressStageApi } from "@/composables/useProgressStageApi";
import { useNotify } from "@/composables/useNotify";

/** Selaras `stageData` di dashboard / project-progress */
export type DashboardProgressStageRow = {
  projectDetailId: string;
  stageData?:
    | Record<
        string,
        {
          plan_submit_date?: string | null;
          actual_approve_date?: string | null;
        }
      >
    | null;
};

export type ProgressStageDef = {
  code: string;
  name: string;
  sequence: number;
};

/**
 * Tahap pipeline untuk chart: dari CAF sampai stage Accrued (urutan `sequence`).
 * Jika kode tidak ada, pakai rentang seaman mungkin (CAF → akhir / awal → akhir).
 */
export function sliceProgressStagesCafThroughAccrued(
  stages: ProgressStageDef[],
): ProgressStageDef[] {
  const sorted = [...stages].sort((a, b) => a.sequence - b.sequence);
  if (sorted.length === 0) return [];

  const idxCaf = sorted.findIndex(
    (s) => s.code.trim().toUpperCase() === "CAF",
  );
  const start = idxCaf >= 0 ? idxCaf : 0;

  let end = sorted.length - 1;
  for (let i = sorted.length - 1; i >= start; i--) {
    const c = sorted[i]!.code.trim();
    if (/^ACCRU/i.test(c)) {
      end = i;
      break;
    }
  }
  if (end < start) end = sorted.length - 1;
  return sorted.slice(start, end + 1);
}

function getErrorMessage(err: unknown) {
  const e = err as { data?: { message?: string }; message?: string };
  return e?.data?.message || e?.message || "Failed to load progress stages";
}

function hasActualDate(
  st?: { actual_approve_date?: string | null } | null,
): boolean {
  return Boolean(String(st?.actual_approve_date ?? "").trim());
}

function formatStageBarPercent(completed: number, remaining: number) {
  const total = completed + remaining;
  if (total <= 0) return { completedPct: 0, remainingPct: 0, total: 0 };
  const completedPct = Math.round((completed / total) * 100);
  return {
    completedPct,
    remainingPct: 100 - completedPct,
    total,
  };
}

/** Per stage: detail line terfilter vs sudah / belum actual. */
export function computeStageDetailBarCounts(
  rows: DashboardProgressStageRow[],
  stageCodes: string[],
  totalDetailLines: number,
): { actual: number[]; pending: number[] } {
  const actual = stageCodes.map(() => 0);

  for (const row of rows) {
    const sd = row.stageData ?? {};
    for (let i = 0; i < stageCodes.length; i++) {
      if (hasActualDate(sd[stageCodes[i]!])) actual[i] = (actual[i] ?? 0) + 1;
    }
  }

  const pending = actual.map((count) =>
    Math.max(0, totalDetailLines - count),
  );
  return { actual, pending };
}

/**
 * Chart garis Plan vs Actual per stage (filter mengikuti `filteredProgressRows`).
 */
export function useDashboardProgressStageChart(
  filteredProgressRows: ComputedRef<DashboardProgressStageRow[]>,
  totalDetailLines: ComputedRef<number>,
) {
  const stageList = ref<ProgressStageDef[]>([]);
  const stagesLoadError = ref<string | null>(null);
  const stagesLoading = ref(false);
  const { getProgressStages } = useProgressStageApi();
  const notify = useNotify();

  const loadProgressStages = async () => {
    stagesLoading.value = true;
    try {
      stagesLoadError.value = null;
      const res: unknown = await getProgressStages({
        limit: 1000,
        isActive: true,
      });
      const body = res as {
        data?: { items?: ProgressStageDef[] };
      };
      const items = body?.data?.items ?? [];
      stageList.value = [...items].sort((a, b) => a.sequence - b.sequence);
    } catch (err: unknown) {
      stagesLoadError.value = getErrorMessage(err);
      stageList.value = [];
      notify.error(stagesLoadError.value);
    } finally {
      stagesLoading.value = false;
    }
  };

  const pipelineStages = computed(() =>
    sliceProgressStagesCafThroughAccrued(stageList.value),
  );

  const stagePipelineChart = computed(() => {
    const stages = pipelineStages.value;
    const rows = filteredProgressRows.value;

    if (stages.length === 0) {
      return {
        labels: [] as string[],
        datasets: [
          {
            label: "Planned",
            data: [] as number[],
            borderColor: "#f77f00",
            backgroundColor: "rgba(247,127,0,0.15)",
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
          },
          {
            label: "Actual",
            data: [] as number[],
            borderColor: "#2a9d8f",
            backgroundColor: "rgba(42,157,143,0.15)",
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
          },
        ],
      };
    }

    const codes = stages.map((s) => s.code);
    const labels = stages.map((s) => (s.name?.trim() ? s.name : s.code));
    const plan: number[] = codes.map(() => 0);
    const actual: number[] = codes.map(() => 0);

    for (const row of rows) {
      const sd = row.stageData ?? {};
      for (let i = 0; i < codes.length; i++) {
        const st = sd[codes[i]!];
        if (!st) continue;
        if (String(st.plan_submit_date ?? "").trim()) plan[i] = (plan[i] ?? 0) + 1;
        if (hasActualDate(st)) actual[i] = (actual[i] ?? 0) + 1;
      }
    }

    const { actual: barActual, pending: barPending } =
      computeStageDetailBarCounts(rows, codes, totalDetailLines.value);

    return {
      labels,
      datasets: [
        {
          type: "bar" as const,
          label: "Completed",
          data: barActual,
          backgroundColor: "rgba(42,157,143,0.62)",
          borderColor: "rgba(42,157,143,0.9)",
          borderWidth: 1,
          borderRadius: 3,
          stack: "detailLines",
          order: 2,
          yAxisID: "y",
        },
        {
          type: "bar" as const,
          label: "Remaining",
          data: barPending,
          backgroundColor: "rgba(173, 181, 189, 0.72)",
          borderColor: "rgba(108, 117, 125, 0.85)",
          borderWidth: 1,
          borderRadius: 3,
          stack: "detailLines",
          order: 2,
          yAxisID: "y",
        },
        {
          type: "line" as const,
          label: "Planned",
          data: plan,
          borderColor: "#f77f00",
          backgroundColor: "rgba(247,127,0,0.18)",
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2,
          fill: false,
          order: 1,
          stack: "planned-line",
          yAxisID: "y",
        },
        {
          type: "line" as const,
          label: "Actual",
          data: actual,
          borderColor: "#2a9d8f",
          backgroundColor: "rgba(42,157,143,0.18)",
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2,
          fill: false,
          order: 1,
          stack: "actual-line",
          yAxisID: "y",
        },
      ],
    };
  });

  const hasPipelineStages = computed(() => pipelineStages.value.length > 0);

  return {
    loadProgressStages,
    stagePipelineChart,
    pipelineStages,
    hasPipelineStages,
    stagesLoadError,
    stagesLoading,
  };
}

/** Label persentase di dalam segmen batang Completed / Remaining. */
export const stageBarPercentLabelsPlugin = {
  id: "stageBarPercentLabels",
  afterDatasetsDraw(chart: {
    ctx: CanvasRenderingContext2D;
    data: { datasets: { label?: string; data: unknown[] }[] };
    getDatasetMeta: (index: number) => {
      data: {
        getProps: (
          props: string[],
          useFinalPosition?: boolean,
        ) => { x: number; y: number; base: number };
      }[];
    };
  }) {
    const { ctx, data } = chart;
    const completedIdx = data.datasets.findIndex((d) => d.label === "Completed");
    const remainingIdx = data.datasets.findIndex((d) => d.label === "Remaining");
    if (completedIdx < 0 || remainingIdx < 0) return;

    const completedMeta = chart.getDatasetMeta(completedIdx);
    const remainingMeta = chart.getDatasetMeta(remainingIdx);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    for (let i = 0; i < completedMeta.data.length; i++) {
      const completed = Number(data.datasets[completedIdx]?.data[i] ?? 0);
      const remaining = Number(data.datasets[remainingIdx]?.data[i] ?? 0);
      const { completedPct, remainingPct } = formatStageBarPercent(
        completed,
        remaining,
      );

      const completedBar = completedMeta.data[i];
      if (completed > 0 && completedPct >= 8 && completedBar) {
        const props = completedBar.getProps(["x", "y", "base"], true);
        const midY = (props.y + props.base) / 2;
        if (Math.abs(props.y - props.base) >= 14) {
          ctx.fillStyle = "#ffffff";
          ctx.fillText(`${completedPct}%`, props.x, midY);
        }
      }

      const remainingBar = remainingMeta.data[i];
      if (remaining > 0 && remainingPct >= 8 && remainingBar) {
        const props = remainingBar.getProps(["x", "y", "base"], true);
        const midY = (props.y + props.base) / 2;
        if (Math.abs(props.y - props.base) >= 14) {
          ctx.fillStyle = "#495057";
          ctx.fillText(`${remainingPct}%`, props.x, midY);
        }
      }
    }

    ctx.restore();
  },
};

/** Opsi Chart.js khusus chart stage (garis + batang bertumpuk per detail line). */
export const dashboardStageChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index" as const,
    intersect: false,
  },
  plugins: {
    legend: { position: "top" as const },
    tooltip: {
      callbacks: {
        label(
          context: {
            dataset: { label?: string; data?: unknown[] };
            parsed?: { y?: number };
            chart: { data: { datasets: { label?: string; data?: unknown[] }[] } };
            dataIndex: number;
          },
        ) {
          const label = context.dataset.label ?? "";
          const value = Number(context.parsed?.y ?? 0);
          const barLabels = new Set(["Completed", "Remaining"]);

          if (!barLabels.has(label)) {
            return `${label}: ${value}`;
          }

          const datasets = context.chart.data.datasets;
          const completedIdx = datasets.findIndex((d) => d.label === "Completed");
          const remainingIdx = datasets.findIndex((d) => d.label === "Remaining");
          const completed = Number(
            datasets[completedIdx]?.label === "Completed"
              ? datasets[completedIdx]?.data?.[context.dataIndex]
              : 0,
          );
          const remaining = Number(
            datasets[remainingIdx]?.label === "Remaining"
              ? datasets[remainingIdx]?.data?.[context.dataIndex]
              : 0,
          );
          const { completedPct, remainingPct, total } = formatStageBarPercent(
            completed,
            remaining,
          );
          if (total <= 0) return `${label}: ${value}`;

          const pct = label === "Completed" ? completedPct : remainingPct;
          return `${label}: ${value} (${pct}%)`;
        },
        footer(
          tooltipItems: {
            datasetIndex: number;
            parsed?: { y?: number };
            dataIndex: number;
            chart: { data: { datasets: { label?: string; data?: unknown[] }[] } };
          }[],
        ) {
          const barLabels = new Set(["Completed", "Remaining"]);
          const hasBar = tooltipItems.some((item) =>
            barLabels.has(
              item.chart.data.datasets[item.datasetIndex]?.label ?? "",
            ),
          );
          if (!hasBar) return "";

          const first = tooltipItems[0];
          if (!first) return "";

          const datasets = first.chart.data.datasets;
          const completedIdx = datasets.findIndex((d) => d.label === "Completed");
          const remainingIdx = datasets.findIndex((d) => d.label === "Remaining");
          const completed = Number(
            datasets[completedIdx]?.data?.[first.dataIndex] ?? 0,
          );
          const remaining = Number(
            datasets[remainingIdx]?.data?.[first.dataIndex] ?? 0,
          );
          const { total } = formatStageBarPercent(completed, remaining);
          if (total <= 0) return "";
          return `Total detail lines: ${total}`;
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: true, color: "rgba(0,0,0,0.07)" },
      ticks: { maxRotation: 42, minRotation: 0, autoSkip: true },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        precision: 0,
      },
      grid: { display: true, color: "rgba(0,0,0,0.07)" },
    },
  },
};
