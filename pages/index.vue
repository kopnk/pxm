<template>
  <div class="dashboard-wrap">
    <div class="dashboard-head">
      <div>
        <h2 class="dashboard-title">Projects eXecution Monitoring</h2>
        <p class="dashboard-subtitle">
          Data source: Projects, Details, Progress, Financials
        </p>
      </div>
      <div class="ws-indicator" :class="isConnected ? 'connected' : 'disconnected'">
        <span class="ws-dot"></span>
        <span>{{ isConnected ? "WS Connected" : "WS Disconnected" }}</span>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger py-2 px-3 mb-3">
      {{ errorMessage }}
    </div>

    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body row g-2">
        <div class="col-lg-4">
          <label class="form-label small text-muted mb-1">Project / PO</label>
          <input
            v-model="projectKeyword"
            class="form-control form-control-sm"
            placeholder="Search Project Name or PO number"
          />
        </div>
        <div class="col-lg-4">
          <label class="form-label small text-muted mb-1">Region</label>
          <select v-model="regionFilter" class="form-select form-select-sm">
            <option value="">All Region</option>
            <option
              v-for="region in regionOptions"
              :key="region"
              :value="region"
            >
              {{ region }}
            </option>
          </select>
        </div>
        <div class="col-lg-4">
          <label class="form-label small text-muted mb-1">Sub Region</label>
          <select v-model="subRegionFilter" class="form-select form-select-sm">
            <option value="">All Sub Region</option>
            <option v-for="sub in subRegionOptions" :key="sub" :value="sub">
              {{ sub }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="summary-grid mb-3">
      <div class="metric-card">
        <div class="metric-label">Projects</div>
        <div class="metric-value">{{ projectCount }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Details</div>
        <div class="metric-value">{{ detailCount }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Progress</div>
        <div class="metric-value">{{ progressSiteCount }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">
          PO Price (Incl Tax {{ poPriceTaxRateLabel }})
        </div>
        <div class="metric-value">
          {{ formatCurrency(poPriceInclTaxDisplay) }}
        </div>
        <div class="data-meta">
          Omzet (Excl PPN): {{ formatCurrency(omzetNet) }}
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="card clickable" @click="openPanel('cpi')">
        <h3 class="section-title">CPI & SPI Trend (Weekly)</h3>
        <div class="chart-container">
          <Line :data="cpiSpiChart" :options="chartOptions" />
        </div>
      </div>

      <div class="card clickable" @click="openPanel('progress')">
        <h3 class="section-title">Progress Site Trend (Weekly)</h3>
        <div class="chart-container">
          <Line :data="progressChart" :options="chartOptions" />
        </div>
      </div>

      <div class="card clickable" @click="openPanel('scurve')">
        <h3 class="section-title">S-Curve (Plan vs Actual)</h3>
        <div class="chart-container">
          <Line :data="sCurveChart" :options="chartOptions" />
        </div>
      </div>

      <div class="card summary-card">
        <h3 class="section-title">Project Summary</h3>

        <div class="summary-item">
          <span>CPI <span class="summary-hint">(EV/AC)</span></span>
          <span :class="cpi >= 1 ? 'good' : 'bad'">{{ cpi.toFixed(2) }}</span>
        </div>
        <div class="summary-item">
          <span>SPI <span class="summary-hint">(EV/PV)</span></span>
          <span :class="spi >= 1 ? 'good' : 'bad'">{{ spi.toFixed(2) }}</span>
        </div>
        <div class="summary-item">
          <span>PV <span class="summary-hint">(Budget x Plan%)</span></span>
          <span>{{ formatCurrency(pvNow) }}</span>
        </div>
        <div class="summary-item">
          <span>EV <span class="summary-hint">(Budget x Actual%)</span></span>
          <span>{{ formatCurrency(evNow) }}</span>
        </div>
        <div class="summary-item">
          <span
            >AC
            <span class="summary-hint">(Qty x Unit Price Partner)</span></span
          >
          <span>{{ formatCurrency(acNow) }}</span>
        </div>

        <div class="status-box" :class="projectHealthy ? 'good-bg' : 'bad-bg'">
          {{ projectHealthy ? "Project On Track" : "Project At Risk" }}
        </div>
      </div>
    </div>

    <div v-if="activePanel" class="fullscreen" @click="activePanel = null">
      <div class="fullscreen-content" @click.stop>
        <h3 class="mb-3 fw-bold">{{ panelTitle }}</h3>
        <div class="fullscreen-chart-wrap">
          <Line
            v-if="activePanel === 'cpi'"
            :data="cpiSpiChart"
            :options="chartOptions"
          />
          <Line
            v-if="activePanel === 'progress'"
            :data="progressChart"
            :options="chartOptions"
          />
          <Line
            v-if="activePanel === 'scurve'"
            :data="sCurveChart"
            :options="chartOptions"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "vue-chartjs";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useDashboardRefreshSocket } from "@/composables/useDashboardRefreshSocket";
import { useNotify } from "@/composables/useNotify";

type ProjectRow = {
  id: string;
  projectName?: string | null;
  poNumber?: string | null;
  subTotal?: number | null;
  vatRate?: number | null;
  grandTotal?: number | null;
};

type ProjectDetailRow = {
  id: string;
  projectId: string;
  projectName?: string | null;
  poNumber?: string | null;
  regionName?: string | null;
  subRegionName?: string | null;
  totalPrice?: number | null;
  status?: string | null;
};

type ProgressStage = {
  plan_submit_date?: string | null;
  actual_approve_date?: string | null;
  status?: string | null;
};

type ProjectProgressRow = {
  id: string;
  projectId: string;
  projectDetailId: string;
  stageData?: Record<string, ProgressStage> | null;
};

type ProjectFinancialRow = {
  id: string;
  projectId?: string | null;
  projectDetailId?: string | null;
  flowDirection?: "in" | "out" | null;
  status?: string | null;
  docDate?: string | null;
  qtyClient?: unknown;
  unitPriceClient?: unknown;
  taxOut?: unknown;
  qtyPartner?: unknown;
  unitPricePartner?: unknown;
  pph?: unknown;
  taxIn?: unknown;
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

/* =========================================================
   FLOW 1/6 - STATE DASAR DASHBOARD
   Fungsi: menyiapkan penampung data dan status UI.
   ========================================================= */
const loading = ref(false);
const errorMessage = ref("");
const notify = useNotify();
const { isConnected, connect, disconnect } = useDashboardRefreshSocket();

const projects = ref<ProjectRow[]>([]);
const details = ref<ProjectDetailRow[]>([]);
const progressRows = ref<ProjectProgressRow[]>([]);
const financialRows = ref<ProjectFinancialRow[]>([]);

/* FILTER STATE:
   Jika semua kosong, dashboard otomatis menampilkan seluruh project/data. */
const projectKeyword = ref("");
const regionFilter = ref("");
const subRegionFilter = ref("");

const activePanel = ref<string | null>(null);
/* REMARK:
  openPanel(panel):
  dipanggil saat user klik kartu chart.
  Fungsi: buka modal fullscreen chart sesuai panel yang dipilih.
*/
const openPanel = (panel: string) => (activePanel.value = panel);

/* =========================================================
   FLOW 2/6 - DEFINISI TIMELINE WEEKLY
   Fungsi: menentukan rentang 8 minggu terakhir untuk semua chart.
   ========================================================= */
const weekKeys = ref<string[]>(getLastWeekKeys(8));

const cpiSeries = ref<number[]>(new Array(8).fill(0));
const spiSeries = ref<number[]>(new Array(8).fill(0));
const progressSeries = ref<number[]>(new Array(8).fill(0));
const sCurvePlanSeries = ref<number[]>(new Array(8).fill(0));
const sCurveActualSeries = ref<number[]>(new Array(8).fill(0));

/* FILTER OPTIONS:
   Region/Sub Region diambil dari data detail yang tersedia. */
const regionOptions = computed(() => {
  const unique = new Set<string>();
  for (const row of details.value) {
    const name = row.regionName?.trim();
    if (name) unique.add(name);
  }
  return [...unique].sort((a, b) => a.localeCompare(b));
});

const subRegionOptions = computed(() => {
  const unique = new Set<string>();
  for (const row of details.value) {
    const sub = row.subRegionName?.trim();
    if (!sub) continue;
    if (regionFilter.value && row.regionName !== regionFilter.value) continue;
    unique.add(sub);
  }
  return [...unique].sort((a, b) => a.localeCompare(b));
});

/* DATA TERFILTER:
   Semua KPI/chart memakai data ini agar sinkron dengan filter dashboard. */
const filteredProjects = computed(() => {
  const keyword = projectKeyword.value.trim().toLowerCase();
  const region = regionFilter.value;
  const subRegion = subRegionFilter.value;

  return projects.value.filter((project) => {
    const matchKeyword =
      !keyword ||
      `${project.projectName || ""} ${project.poNumber || ""}`
        .toLowerCase()
        .includes(keyword);

    const matchArea =
      (!region && !subRegion) ||
      details.value.some((d) => {
        if (d.projectId !== project.id) return false;
        if (region && d.regionName !== region) return false;
        if (subRegion && d.subRegionName !== subRegion) return false;
        return true;
      });

    return matchKeyword && matchArea;
  });
});

const filteredProjectIds = computed(() => {
  return new Set(filteredProjects.value.map((p) => p.id));
});

const filteredDetails = computed(() => {
  const region = regionFilter.value;
  const subRegion = subRegionFilter.value;

  return details.value.filter((row) => {
    if (!filteredProjectIds.value.has(row.projectId)) return false;
    if (region && row.regionName !== region) return false;
    if (subRegion && row.subRegionName !== subRegion) return false;
    return true;
  });
});

const filteredDetailIds = computed(() => {
  return new Set(filteredDetails.value.map((d) => d.id));
});

const filteredProgressRows = computed(() => {
  return progressRows.value.filter((row) => {
    if (!filteredProjectIds.value.has(row.projectId)) return false;
    return filteredDetailIds.value.has(row.projectDetailId);
  });
});

const filteredFinancialRows = computed(() => {
  return financialRows.value.filter((row) => {
    if (!row.projectId) return false;
    if (!filteredProjectIds.value.has(row.projectId)) return false;
    if (!row.projectDetailId) return true;
    return filteredDetailIds.value.has(row.projectDetailId);
  });
});

/* =========================================================
   FLOW 3/6 - KPI TURUNAN (COMPUTED)
   Fungsi: mengubah data mentah jadi angka siap tampil.
   Contoh output: CPI/SPI, Progress %, PV/EV/AC, Profit.
   ========================================================= */
const projectCount = computed(() => filteredProjects.value.length);
const detailCount = computed(() => filteredDetails.value.length);

const cpi = computed(() => cpiSeries.value.at(-1) ?? 0);
const spi = computed(() => spiSeries.value.at(-1) ?? 0);
const progressSiteCount = computed(() =>
  Math.round(progressSeries.value.at(-1) ?? 0),
);

const pvNow = computed(() => {
  const idx = sCurvePlanSeries.value.length - 1;
  const planRatio = (sCurvePlanSeries.value[idx] ?? 0) / 100;
  return totalBudget.value * planRatio;
});

const evNow = computed(() => {
  const idx = sCurveActualSeries.value.length - 1;
  const actualRatio = (sCurveActualSeries.value[idx] ?? 0) / 100;
  return totalBudget.value * actualRatio;
});

const acNow = computed(() => totalOutflow.value);

const projectHealthy = computed(() => {
  return cpi.value >= 1 && spi.value >= 1;
});

const totalBudget = computed(() => {
  if (poPriceBaseline.value > 0) return poPriceBaseline.value;

  const fromDetails = filteredDetails.value.reduce((sum, row) => {
    if (row.status === "cancelled") return sum;
    return sum + safeNumber(row.totalPrice);
  }, 0);

  if (fromDetails > 0) return fromDetails;

  return filteredProjects.value.reduce((sum, row) => {
    return sum + safeNumber(row.subTotal);
  }, 0);
});

const poPriceBaseline = computed(() => {
  return filteredProjects.value.reduce((sum, row) => {
    return sum + safeNumber(row.subTotal);
  }, 0);
});

const poPriceInclTaxDisplay = computed(() => {
  const fromGrandTotal = filteredProjects.value.reduce((sum, row) => {
    return sum + safeNumber(row.grandTotal);
  }, 0);

  if (fromGrandTotal > 0) return fromGrandTotal;

  return filteredProjects.value.reduce((sum, row) => {
    const subTotal = safeNumber(row.subTotal);
    const vatRate = safeNumber(row.vatRate);
    return sum + subTotal * (1 + vatRate / 100);
  }, 0);
});

const poPriceTaxRateLabel = computed(() => {
  const rates = new Set<number>();
  for (const row of filteredProjects.value) {
    const rate = safeNumber(row.vatRate);
    rates.add(rate);
  }

  if (rates.size === 1) {
    const value = [...rates][0];
    return `${Number.isInteger(value) ? value.toFixed(0) : value}%`;
  }

  if (rates.size > 1) return "mixed";
  return "0%";
});

const totalInflowNet = computed(() => {
  return filteredFinancialRows.value.reduce((sum, row) => {
    if (row.flowDirection !== "out") return sum;
    if (row.status === "cancelled") return sum;
    return sum + safeNumber(row.qtyClient) * safeNumber(row.unitPriceClient);
  }, 0);
});

const totalOutflow = computed(() => {
  return filteredFinancialRows.value.reduce((sum, row) => {
    if (row.flowDirection !== "in") return sum;
    if (row.status === "cancelled") return sum;
    return sum + safeNumber(row.qtyPartner) * safeNumber(row.unitPricePartner);
  }, 0);
});

const omzetNet = computed(() => totalInflowNet.value);

const panelTitle = computed(() => {
  switch (activePanel.value) {
    case "cpi":
      return "CPI & SPI Trend (Weekly)";
    case "progress":
      return "Progress Site Trend (Weekly)";
    case "scurve":
      return "S-Curve";
    default:
      return "";
  }
});

const chartLabels = computed(() => {
  return weekKeys.value.map((key) => formatWeekLabel(key));
});

const cpiSpiChart = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: "CPI",
      data: cpiSeries.value,
      borderColor: "#16a34a",
      backgroundColor: "rgba(22,163,74,0.2)",
      tension: 0.25,
    },
    {
      label: "SPI",
      data: spiSeries.value,
      borderColor: "#d62828",
      backgroundColor: "rgba(214,40,40,0.2)",
      tension: 0.25,
    },
  ],
}));

const progressChart = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: "Progress Site",
      data: progressSeries.value,
      borderColor: "#1d3557",
      backgroundColor: "rgba(29,53,87,0.2)",
      tension: 0.25,
    },
  ],
}));

const sCurveChart = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: "Planned %",
      data: sCurvePlanSeries.value,
      borderColor: "#f77f00",
      backgroundColor: "rgba(247,127,0,0.2)",
      tension: 0.25,
    },
    {
      label: "Actual %",
      data: sCurveActualSeries.value,
      borderColor: "#2a9d8f",
      backgroundColor: "rgba(42,157,143,0.2)",
      tension: 0.25,
    },
  ],
}));

/* =========================================================
   FLOW 4/6 - KONFIGURASI VISUAL CHART
   Fungsi: menyamakan behavior seluruh chart (responsive, legend, axis).
   ========================================================= */
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" as const },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

/* =========================================================
   FLOW 5/6 - LOAD DATA UTAMA
   Urutan kerja:
   1. Ambil data API secara paralel.
   2. Simpan ke state mentah.
   3. Panggil rebuildSeries() untuk hitung seri chart.
   4. Jika gagal, tampilkan pesan error di UI.
   ========================================================= */
async function loadDashboard() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [p, d, pr, f] = await Promise.all([
      fetchAllPages<ProjectRow>("/api/projects", 200),
      fetchAllPages<ProjectDetailRow>("/api/project_details", 200),
      fetchAllPages<ProjectProgressRow>("/api/project_progress", 200),
      fetchAllPages<ProjectFinancialRow>("/api/project_financials", 200),
    ]);

    projects.value = p;
    details.value = d;
    progressRows.value = pr;
    financialRows.value = f;

    rebuildSeries();
  } catch (err: any) {
    errorMessage.value =
      err?.data?.message || err?.message || "Failed to load dashboard data";
  } finally {
    loading.value = false;
  }
}

/* =========================================================
   FLOW 6/6 - MESIN HITUNG DASHBOARD (CORE ENGINE)
   Urutan kerja:
   1. Group data progress & financial per minggu.
   2. Hitung cumulative Plan/Actual/Outflow.
   3. Turunkan CPI, SPI, Progress, dan S-Curve per minggu.
   4. Simpan hasil ke series chart agar langsung ter-render.
   ========================================================= */
function rebuildSeries() {
  const keys = getLastWeekKeys(8);
  weekKeys.value = keys;

  const currentProgressRows = filteredProgressRows.value;
  const currentFinancialRows = filteredFinancialRows.value;

  const plannedPointsByWeek: Record<string, number> = {};
  const actualPointsByWeek: Record<string, number> = {};
  const completedSitesByWeek: Record<string, number> = {};
  const outflowByWeek: Record<string, number> = {};

  let totalStages = 0;
  const siteFirstActualWeek = new Map<string, string>();

  for (const row of currentProgressRows) {
    const stages = Object.values(row.stageData || {});
    let firstActualWeek: string | null = null;

    for (const stage of stages) {
      totalStages += 1;

      const planKey = toWeekKey(stage.plan_submit_date);
      if (planKey) {
        plannedPointsByWeek[planKey] = (plannedPointsByWeek[planKey] || 0) + 1;
      }

      const actualKey = toWeekKey(stage.actual_approve_date);
      if (actualKey) {
        actualPointsByWeek[actualKey] =
          (actualPointsByWeek[actualKey] || 0) + 1;
        if (!firstActualWeek || actualKey < firstActualWeek) {
          firstActualWeek = actualKey;
        }
      }
    }

    if (firstActualWeek) {
      const existing = siteFirstActualWeek.get(row.projectDetailId);
      if (!existing || firstActualWeek < existing) {
        siteFirstActualWeek.set(row.projectDetailId, firstActualWeek);
      }
    }
  }

  for (const week of siteFirstActualWeek.values()) {
    completedSitesByWeek[week] = (completedSitesByWeek[week] || 0) + 1;
  }

  for (const row of currentFinancialRows) {
    if (row.flowDirection !== "in" || row.status === "cancelled") continue;
    const key = toWeekKey(row.docDate);
    if (!key) continue;
    const v = safeNumber(row.qtyPartner) * safeNumber(row.unitPricePartner);
    outflowByWeek[key] = (outflowByWeek[key] || 0) + v;
  }

  const timelineTotalStages =
    Object.values(plannedPointsByWeek).reduce((s, v) => s + v, 0) ||
    totalStages ||
    1;

  let cumulativePlan = 0;
  let cumulativeActual = 0;
  let cumulativeCompletedSites = 0;
  let cumulativeOutflow = 0;

  const cpiArr: number[] = [];
  const spiArr: number[] = [];
  const progressArr: number[] = [];
  const sPlanArr: number[] = [];
  const sActualArr: number[] = [];

  for (const key of keys) {
    cumulativePlan += plannedPointsByWeek[key] || 0;
    cumulativeActual += actualPointsByWeek[key] || 0;
    cumulativeCompletedSites += completedSitesByWeek[key] || 0;
    cumulativeOutflow += outflowByWeek[key] || 0;

    const planRatio = clamp(cumulativePlan / timelineTotalStages, 0, 1);
    const actualRatio = clamp(cumulativeActual / timelineTotalStages, 0, 1);

    const pv = totalBudget.value * planRatio;
    const ev = totalBudget.value * actualRatio;
    const ac = cumulativeOutflow;

    const cpiVal = ac > 0 ? ev / ac : ev > 0 ? 1 : 0;
    const spiVal = pv > 0 ? ev / pv : ev > 0 ? 1 : 0;

    cpiArr.push(round2(cpiVal));
    spiArr.push(round2(spiVal));
    progressArr.push(cumulativeCompletedSites);
    sPlanArr.push(Math.round(planRatio * 100));
    sActualArr.push(Math.round(actualRatio * 100));
  }

  cpiSeries.value = cpiArr;
  spiSeries.value = spiArr;
  progressSeries.value = progressArr;
  sCurvePlanSeries.value = sPlanArr;
  sCurveActualSeries.value = sActualArr;
}

/* HELPER: fetchAllPages
   Fungsi: ambil semua halaman endpoint paginated jadi satu array. */
async function fetchAllPages<T>(endpoint: string, limit = 200) {
  let page = 1;
  let totalPages = 1;
  const items: T[] = [];

  while (page <= totalPages) {
    const res: any = await $fetch(endpoint, {
      query: { page, limit },
    });

    const data = res?.data || {};
    const pageItems = Array.isArray(data.items) ? data.items : [];
    items.push(...pageItems);

    totalPages = Number(data.totalPages || 1);
    page += 1;
  }

  return items;
}

/* HELPER: getLastWeekKeys
   Fungsi: membentuk daftar key minggu (Senin) untuk rentang chart. */
function getLastWeekKeys(count: number) {
  const now = new Date();
  const keys: string[] = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    const weekStart = startOfWeekMonday(d);
    keys.push(toDateKey(weekStart));
  }

  return keys;
}

/* HELPER: toWeekKey
   Fungsi: normalisasi tanggal ke key bucket mingguan. */
function toWeekKey(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return toDateKey(startOfWeekMonday(date));
}

/* HELPER: startOfWeekMonday
   Fungsi: geser tanggal ke Senin minggu yang sama. */
function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/* HELPER: toDateKey
   Fungsi: format Date menjadi YYYY-MM-DD (stabil untuk object key). */
function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* HELPER: safeNumber
   Fungsi: amankan nilai angka dari null/undefined/NaN. */
function safeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

/* HELPER: formatWeekLabel
   Fungsi: ubah key minggu menjadi label visual chart (contoh 08-14 Apr). */
function formatWeekLabel(key: string) {
  const start = new Date(key);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startDay = String(start.getDate()).padStart(2, "0");
  const endDay = String(end.getDate()).padStart(2, "0");
  const month = end.toLocaleString("id-ID", { month: "short" });

  return `${startDay}-${endDay} ${month}`;
}

/* HELPER: round2
   Fungsi: pembulatan 2 desimal untuk KPI rasio (CPI/SPI). */
function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/* HELPER: clamp
   Fungsi: membatasi rasio agar tetap pada range aman (mis. 0..1). */
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/* HELPER: formatCurrency
   Fungsi: format angka menjadi mata uang IDR untuk tampilan UI. */
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safeNumber(val));

/* ENTRY POINT UI:
   Saat komponen selesai mount, langsung load data dashboard. */
onMounted(async () => {
  await loadDashboard();
  connect(loadDashboard, (message) => notify.warning(message));
});

onUnmounted(() => {
  disconnect();
});

watch([projectKeyword, regionFilter, subRegionFilter], () => {
  if (
    subRegionFilter.value &&
    !subRegionOptions.value.includes(subRegionFilter.value)
  ) {
    subRegionFilter.value = "";
    return;
  }
  rebuildSeries();
});
</script>

<style scoped>
.dashboard-wrap {
  height: calc(100vh - 70px);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: auto;
}

.dashboard-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.dashboard-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.dashboard-subtitle {
  margin: 0.25rem 0 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.ws-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid #ececec;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  background: #fff;
}

.ws-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.ws-indicator.connected {
  color: #198754;
}

.ws-indicator.connected .ws-dot {
  background: #198754;
}

.ws-indicator.disconnected {
  color: #dc3545;
}

.ws-indicator.disconnected .ws-dot {
  background: #dc3545;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.metric-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #ececec;
  padding: 0.75rem;
}

.data-meta {
  color: #6c757d;
  font-size: 0.85rem;
}

.metric-label {
  color: #6c757d;
  font-size: 0.85rem;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.charts-grid {
  flex: 1;
  min-height: 550px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.card {
  background: #fff;
  padding: 0.85rem;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.chart-container {
  position: relative;
  flex: 1;
  min-height: 190px;
}

.clickable {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.clickable:hover {
  transform: translateY(-2px);
}

.summary-card {
  justify-content: flex-start;
  gap: 0.1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.45rem;
}

.summary-hint {
  color: #6c757d;
  font-size: 0.8em;
  font-weight: 400;
}

.status-box {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  text-align: center;
  border-radius: 6px;
  font-weight: 600;
}

.good {
  color: #198754;
}

.bad {
  color: #dc3545;
}

.good-bg {
  background: #d1e7dd;
  color: #0f5132;
}

.bad-bg {
  background: #f8d7da;
  color: #842029;
}

.fullscreen {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.fullscreen-content {
  background: #fff;
  width: min(1100px, 92vw);
  height: min(650px, 90vh);
  padding: 1rem;
  border-radius: 10px;
}

.fullscreen-chart-wrap {
  position: relative;
  height: calc(100% - 2.25rem);
}

@media (max-width: 992px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .charts-grid {
    grid-template-columns: 1fr;
    min-height: 900px;
  }
}

@media (max-width: 576px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
