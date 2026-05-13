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

/**
 * Chart garis Plan vs Actual per stage (filter mengikuti `filteredProgressRows`).
 */
export function useDashboardProgressStageChart(
  filteredProgressRows: ComputedRef<DashboardProgressStageRow[]>,
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
        if (String(st.plan_submit_date ?? "").trim()) plan[i] += 1;
        if (String(st.actual_approve_date ?? "").trim()) actual[i] += 1;
      }
    }

    return {
      labels,
      datasets: [
        {
          label: "Planned",
          data: plan,
          borderColor: "#f77f00",
          backgroundColor: "rgba(247,127,0,0.18)",
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2,
          fill: false,
        },
        {
          label: "Actual",
          data: actual,
          borderColor: "#2a9d8f",
          backgroundColor: "rgba(42,157,143,0.18)",
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2,
          fill: false,
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

/** Opsi Chart.js khusus chart stage (sumbu Y bilangan bulat + grid). */
export const dashboardStageChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index" as const,
    intersect: false,
  },
  plugins: {
    legend: { position: "top" as const },
  },
  scales: {
    x: {
      grid: { display: true, color: "rgba(0,0,0,0.07)" },
      ticks: { maxRotation: 42, minRotation: 0, autoSkip: true },
    },
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        precision: 0,
      },
      grid: { display: true, color: "rgba(0,0,0,0.07)" },
    },
  },
};
