<template>
  <div class="health-grid">
    <section class="card health-card">
      <h3 class="section-title">Project Progress by Site</h3>
      <div class="donut-wrap">
        <Doughnut
          :data="siteChartData"
          :options="siteChartOptions"
          :plugins="[doughnutPercentLabelsPlugin]"
        />
        <div class="donut-center" aria-hidden="true">
          <strong>{{ details.length }}</strong>
          <span>Site / Details</span>
        </div>
      </div>
    </section>

    <section class="card health-card">
      <h3 class="section-title">Project Progress by HPP</h3>
      <div class="donut-wrap">
        <Doughnut
          :data="valueChartData"
          :options="valueChartOptions"
          :plugins="[doughnutPercentLabelsPlugin]"
        />
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
    {
      plan_submit_date?: string | null;
      actual_approve_date?: string | null;
      status?: string | null;
    }
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

const doughnutPercentLabelsPlugin = {
  id: "doughnutPercentLabels",
  afterDatasetsDraw(chart: any) {
    const config = chart.options?.plugins?.doughnutPercentLabels;
    const total = Number(config?.total ?? 0);
    if (!config?.enabled || total <= 0) return;

    const values = chart.data.datasets[0]?.data ?? [];
    const arcs = chart.getDatasetMeta(0).data;
    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    arcs.forEach((arc: any, index: number) => {
      const value = safeNumber(values[index]);
      if (value <= 0) return;
      const props = arc.getProps(
        ["x", "y", "startAngle", "endAngle", "innerRadius", "outerRadius"],
        true,
      );
      const angle = (props.startAngle + props.endAngle) / 2;
      const radius = (props.innerRadius + props.outerRadius) / 2;
      ctx.fillText(
        `${((value / total) * 100).toFixed(0)}%`,
        props.x + Math.cos(angle) * radius,
        props.y + Math.sin(angle) * radius,
      );
    });
    ctx.restore();
  },
};

const colors = [
  "#2563eb", "#0891b2", "#0d9488", "#16a34a", "#65a30d",
  "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#9333ea",
  "#4f46e5", "#475569", "#0f766e", "#a16207", "#be123c",
];

const safeNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const stageSequence = computed(
  () => new Map(props.stages.map((stage) => [stage.code, stage.sequence])),
);

/** Hanya stage yang mempunyai tanggal rencana atau aktual yang dihitung di donut. */
const datedStageCodesByDetail = computed(() => {
  const result = new Map<string, Set<string>>();
  for (const row of props.progressRows) {
    const codes = result.get(row.projectDetailId) ?? new Set<string>();
    for (const [code, stage] of Object.entries(row.stageData ?? {})) {
      if (
        (String(stage.plan_submit_date ?? "").trim() ||
          String(stage.actual_approve_date ?? "").trim()) &&
        stageSequence.value.has(code)
      ) {
        codes.add(code);
      }
    }
    if (codes.size > 0) result.set(row.projectDetailId, codes);
  }
  return result;
});

/** Stage aktual terakhir dipakai untuk alokasi HPP agar nilai tidak terduplikasi. */
const currentStageByDetail = computed(() => {
  const result = new Map<string, string>();
  for (const [detailId, codes] of datedStageCodesByDetail.value) {
    let currentCode = "";
    let currentSequence = -1;
    for (const code of codes) {
      const sequence = stageSequence.value.get(code) ?? -1;
      if (sequence > currentSequence) {
        currentCode = code;
        currentSequence = sequence;
      }
    }
    if (currentCode) result.set(detailId, currentCode);
  }
  return result;
});

const distribution = computed(() => {
  const siteCounts = new Map(props.stages.map((stage) => [stage.code, 0]));
  const hppValues = new Map(props.stages.map((stage) => [stage.code, 0]));
  let notStarted = 0;
  let unallocatedHpp = 0;

  for (const detail of props.details) {
    const codes = datedStageCodesByDetail.value.get(detail.id);
    if (codes?.size) {
      for (const code of codes) {
        siteCounts.set(code, (siteCounts.get(code) ?? 0) + 1);
      }
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

  const siteStages = props.stages.filter(
    (stage) => (siteCounts.get(stage.code) ?? 0) > 0,
  );
  const hppStages = props.stages.filter(
    (stage) => (hppValues.get(stage.code) ?? 0) > 0,
  );
  return {
    siteCounts,
    hppValues,
    siteStages,
    hppStages,
    notStarted,
    unallocatedHpp,
  };
});

const siteStageLabels = computed(() =>
  distribution.value.siteStages.map((stage) => stage.name || stage.code),
);
const hppStageLabels = computed(() =>
  distribution.value.hppStages.map((stage) => stage.name || stage.code),
);

const siteChartColors = computed(() => [
  ...distribution.value.siteStages.map((_, index) => colors[index % colors.length]),
  "#cbd5e1",
]);
const hppChartColors = computed(() => [
  ...distribution.value.hppStages.map((_, index) => colors[index % colors.length]),
  "#cbd5e1",
]);

const siteValues = computed(() => [
  ...distribution.value.siteStages.map(
    (stage) => distribution.value.siteCounts.get(stage.code) ?? 0,
  ),
  distribution.value.notStarted,
]);
const hppValues = computed(() => [
  ...distribution.value.hppStages.map(
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
  [...siteStageLabels.value, "Not started"].map((label, index) => {
    const value = siteValues.value[index] ?? 0;
    return `${label} · ${value} · ${percent(value, props.details.length)}`;
  }),
);
const valueLabels = computed(() =>
  [...hppStageLabels.value, "Unallocated"].map((label, index) => {
    const value = hppValues.value[index] ?? 0;
    return `${label} · ${formatCompactCurrency(value)} · ${percent(value, hpp.value)}`;
  }),
);

const siteChartData = computed(() => ({
  labels: siteLabels.value,
  datasets: [{ data: siteValues.value, backgroundColor: siteChartColors.value, borderWidth: 2 }],
}));
const valueChartData = computed(() => ({
  labels: valueLabels.value,
  datasets: [{ data: hppValues.value, backgroundColor: hppChartColors.value, borderWidth: 2 }],
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
          return `${label}: ${value} actual stage update (${percent(value, props.details.length)})`;
        },
      },
    },
    doughnutPercentLabels: {
      enabled: true,
      total: props.details.length,
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
          return `${label}: ${formatCurrency(value)} (${percent(value, dpp.value)})`;
        },
      },
    },
    doughnutPercentLabels: {
      enabled: true,
      total: hpp.value,
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
