<template>
  <div class="health-grid">
    <section class="card health-card">
      <h3 class="section-title">Project Progress by Site</h3>
      <div class="donut-wrap">
        <Doughnut :data="siteChartData" :options="siteChartOptions" />
        <div class="donut-center" aria-hidden="true">
          <strong>{{ details.length }}</strong>
          <span>Site / Details</span>
        </div>
      </div>
    </section>

    <section class="card health-card">
      <h3 class="section-title">Project Progress by HPP</h3>
      <div class="donut-wrap">
        <Doughnut :data="valueChartData" :options="valueChartOptions" />
        <div class="donut-center donut-center-value" aria-hidden="true">
          <span>PO Excl. PPN</span>
          <strong>{{ formatCompactCurrency(poExclPpn) }}</strong>
          <span>DPP · {{ formatCompactCurrency(dpp) }}</span>
          <span>HPP · {{ formatCompactCurrency(hpp) }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { Doughnut } from "vue-chartjs";
import type { ProgressStageDef } from "@/composables/useDashboardProgressStageChart";

type DetailRow = { id: string };
type ProgressRow = {
  projectDetailId: string;
  stageData?: Record<
    string,
    { actual_approve_date?: string | null; status?: string | null }
  > | null;
};
type FinancialRow = {
  projectDetailId?: string | null;
  flowDirection?: "in" | "out" | null;
  status?: string | null;
  qtyClient?: unknown;
  unitPriceClient?: unknown;
  qtyPartner?: unknown;
  unitPricePartner?: unknown;
};
type ProjectRow = { subTotal?: number | null };

const props = defineProps<{
  stages: ProgressStageDef[];
  details: DetailRow[];
  progressRows: ProgressRow[];
  financialRows: FinancialRow[];
  projects: ProjectRow[];
}>();

ChartJS.register(ArcElement, Tooltip, Legend);

const colors = [
  "#2563eb", "#0891b2", "#0d9488", "#16a34a", "#65a30d",
  "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#9333ea",
  "#4f46e5", "#475569", "#0f766e", "#a16207", "#be123c",
];

const safeNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const stageIndex = computed(
  () => new Map(props.stages.map((stage, index) => [stage.code, index])),
);

const currentStageByDetail = computed(() => {
  const result = new Map<string, string>();
  for (const row of props.progressRows) {
    let currentCode = "";
    let currentIndex = -1;
    for (const [code, stage] of Object.entries(row.stageData ?? {})) {
      if (!String(stage.actual_approve_date ?? "").trim()) continue;
      const index = stageIndex.value.get(code) ?? -1;
      if (index > currentIndex) {
        currentCode = code;
        currentIndex = index;
      }
    }
    if (currentCode) result.set(row.projectDetailId, currentCode);
  }
  return result;
});

const distribution = computed(() => {
  const siteCounts = new Map(props.stages.map((stage) => [stage.code, 0]));
  const hppValues = new Map(props.stages.map((stage) => [stage.code, 0]));
  let notStarted = 0;
  let unallocatedHpp = 0;

  for (const detail of props.details) {
    const code = currentStageByDetail.value.get(detail.id);
    if (code && siteCounts.has(code)) {
      siteCounts.set(code, (siteCounts.get(code) ?? 0) + 1);
    } else {
      notStarted += 1;
    }
  }

  for (const row of props.financialRows) {
    if (row.flowDirection !== "in" || row.status === "cancelled") continue;
    const value = safeNumber(row.qtyPartner) * safeNumber(row.unitPricePartner);
    const code = row.projectDetailId
      ? currentStageByDetail.value.get(row.projectDetailId)
      : undefined;
    if (code && hppValues.has(code)) {
      hppValues.set(code, (hppValues.get(code) ?? 0) + value);
    } else {
      unallocatedHpp += value;
    }
  }

  const activeStages = props.stages.filter(
    (stage) =>
      (siteCounts.get(stage.code) ?? 0) > 0 ||
      (hppValues.get(stage.code) ?? 0) > 0,
  );
  return { siteCounts, hppValues, activeStages, notStarted, unallocatedHpp };
});

const activeStageLabels = computed(() =>
  distribution.value.activeStages.map((stage) => stage.name || stage.code),
);

const chartColors = computed(() => [
  ...distribution.value.activeStages.map((_, index) => colors[index % colors.length]),
  "#cbd5e1",
]);

const siteValues = computed(() => [
  ...distribution.value.activeStages.map(
    (stage) => distribution.value.siteCounts.get(stage.code) ?? 0,
  ),
  distribution.value.notStarted,
]);

const hppValues = computed(() => [
  ...distribution.value.activeStages.map(
    (stage) => distribution.value.hppValues.get(stage.code) ?? 0,
  ),
  distribution.value.unallocatedHpp,
]);

const poExclPpn = computed(() =>
  props.projects.reduce((sum, row) => sum + safeNumber(row.subTotal), 0),
);
const dpp = computed(() =>
  props.financialRows.reduce((sum, row) => {
    if (row.flowDirection !== "out" || row.status === "cancelled") return sum;
    return sum + safeNumber(row.qtyClient) * safeNumber(row.unitPriceClient);
  }, 0),
);
const hpp = computed(() => hppValues.value.reduce((sum, value) => sum + value, 0));

const siteLabels = computed(() =>
  [...activeStageLabels.value, "Not started"].map((label, index) => {
    const value = siteValues.value[index] ?? 0;
    return `${label} · ${value} · ${percent(value, props.details.length)}`;
  }),
);
const valueLabels = computed(() =>
  [...activeStageLabels.value, "Unallocated"].map((label, index) => {
    const value = hppValues.value[index] ?? 0;
    return `${label} · ${formatCompactCurrency(value)} · ${percent(value, hpp.value)}`;
  }),
);

const siteChartData = computed(() => ({
  labels: siteLabels.value,
  datasets: [{ data: siteValues.value, backgroundColor: chartColors.value, borderWidth: 2 }],
}));
const valueChartData = computed(() => ({
  labels: valueLabels.value,
  datasets: [{ data: hppValues.value, backgroundColor: chartColors.value, borderWidth: 2 }],
}));

function percent(value: number, total: number) {
  return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0%";
}

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "66%",
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: { usePointStyle: true, boxWidth: 9, padding: 12, font: { size: 11 } },
    },
  },
};

const siteChartOptions = computed(() => ({
  ...commonOptions,
  plugins: {
    ...commonOptions.plugins,
    tooltip: {
      callbacks: {
        label: (context: { dataIndex: number; raw?: unknown }) => {
          const value = safeNumber(context.raw);
          const label = siteLabels.value[context.dataIndex]?.split(" · ")[0] ?? "Stage";
          return `${label}: ${value} site/detail (${percent(value, props.details.length)})`;
        },
      },
    },
  },
}));

const valueChartOptions = computed(() => ({
  ...commonOptions,
  plugins: {
    ...commonOptions.plugins,
    tooltip: {
      callbacks: {
        label: (context: { dataIndex: number; raw?: unknown }) => {
          const value = safeNumber(context.raw);
          const label = valueLabels.value[context.dataIndex]?.split(" · ")[0] ?? "Stage";
          return `${label}: ${formatCurrency(value)} (${percent(value, hpp.value)})`;
        },
      },
    },
  },
}));

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
</script>

<style scoped>
.health-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
.health-card { min-width: 0; }
.section-title { font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem; }
.donut-wrap { position: relative; height: 330px; min-width: 0; }
.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 122px;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  pointer-events: none;
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1.35;
}
.donut-center strong { color: #0f172a; font-size: 1.45rem; }
.donut-center-value strong { font-size: 0.95rem; margin-bottom: 0.2rem; }
@media (max-width: 991.98px) {
  .health-grid { grid-template-columns: 1fr; }
}
@media (max-width: 575.98px) {
  .donut-wrap { height: 400px; }
}
</style>
