<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useProjectProgressApi } from "@/composables/useProjectProgressApi";
import { useProjectProgressStore } from "@/stores/projectProgress";
import { useFormHandler } from "@/composables/useFormHandler";
import { useProgressStageApi } from "@/composables/useProgressStageApi";
import { useProgressStageStore } from "@/stores/progressStage";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import { useAuthStore } from "@/stores/auth";

const store = useProjectProgressStore();

const { getProjectProgress, deleteProjectProgress } = useProjectProgressApi();
const { getProgressStages } = useProgressStageApi();
const progressStageStore = useProgressStageStore();
const authStore = useAuthStore();
const { canCreate, canEdit, canDelete } = useListPagePermissions();
const { handle } = useFormHandler();
const canCreateProjectProgress = computed(
  () => canCreate.value && authStore.user?.role === "superadmin",
);

const search = ref("");
const stage = ref("");
const status = ref("");

const loading = ref(false);
const showDeleteModal = ref(false);
const deleteTargetId = ref<string | null>(null);
const deleteTargetLabel = ref("this project progress");

const formatDateDMY = (val?: string | null) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatListTimestamp = (v: string | null | undefined) => {
  if (v == null || v === "") return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    return String(v).replace("T", " ").slice(0, 19);
  }
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const stageColumns = computed(() =>
  [...progressStageStore.items].sort((a, b) => a.sequence - b.sequence),
);

const stageDateCounts = computed(() => {
  const counts: Record<string, { plan: number; actual: number }> = {};

  for (const stage of stageColumns.value) {
    counts[stage.code] = { plan: 0, actual: 0 };
  }

  for (const item of store.items) {
    const stageData = item.stageData ?? {};
    for (const stage of stageColumns.value) {
      const row = stageData[stage.code];
      if (!row) continue;

      const planDate = String(row.plan_submit_date ?? "").trim();
      const actualDate = String(row.actual_approve_date ?? "").trim();

      if (planDate) counts[stage.code].plan += 1;
      if (actualDate) counts[stage.code].actual += 1;
    }
  }

  return counts;
});

const tableColspan = computed(() => 4 + stageColumns.value.length);

/** Selaras project-details / useProjectDetailsListPage */
const detailStatusBadgeClass = (value: string | null | undefined) => ({
  "bg-success": value === "active",
  "bg-warning text-dark": value === "delay",
  "bg-secondary": value === "closed" || !value,
  "bg-danger": value === "cancelled",
});

const detailStatusLabel = (value: string | null | undefined) => {
  if (value == null || value === "") return "—";
  const map: Record<string, string> = {
    active: "Active",
    delay: "Delay",
    closed: "Closed",
    cancelled: "Cancelled",
  };
  return map[value] ?? value;
};

const fetchData = async () => {
  loading.value = true;
  try {
    await getProjectProgress({
      page: store.page,
      limit: store.limit,
      search: search.value || undefined,
      stage: stage.value || undefined,
      status: status.value || undefined,
    });
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  const res: any = await getProgressStages({
    limit: 1000,
    isActive: true,
  });
  progressStageStore.setItems(res.data.items);
  await fetchData();
});

watch([search, stage, status], () => {
  store.setPage(1);
  fetchData();
});

const handleDelete = async (id: string, siteName?: string | null) => {
  if (!canDelete.value) return;
  deleteTargetId.value = id;
  deleteTargetLabel.value = siteName?.trim() || "this project progress";
  showDeleteModal.value = true;
};

const performDelete = async () => {
  if (!deleteTargetId.value) return;
  await handle(async () => {
    await deleteProjectProgress(deleteTargetId.value!);
    fetchData();
  }, toastSuccessDeleted("projectProgress"));
  showDeleteModal.value = false;
  deleteTargetId.value = null;
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  deleteTargetId.value = null;
  deleteTargetLabel.value = "this project progress";
};

const prevPage = () => {
  if (store.page > 1) {
    store.setPage(store.page - 1);
    fetchData();
  }
};

const nextPage = () => {
  if (store.page < store.totalPages) {
    store.setPage(store.page + 1);
    fetchData();
  }
};

const showingStart = computed(() => {
  if (store.total === 0) return 0;
  return (store.page - 1) * store.limit + 1;
});

const showingEnd = computed(() =>
  Math.min(store.page * store.limit, store.total),
);
</script>

<template>
  <div class="container py-4">
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">Project progress</h4>

      <NuxtLink
        v-if="canCreateProjectProgress"
        to="/project-progress/create"
        class="btn btn-primary"
      >
        + New Project Progress
      </NuxtLink>
    </div>

    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2">
        <div class="col-md-6">
          <input
            v-model="search"
            class="form-control form-control-sm"
            placeholder="Search"
          />
        </div>

        <div class="col-md-3">
          <input
            v-model="stage"
            class="form-control form-control-sm"
            placeholder="Stage Code"
          />
        </div>

        <div class="col-md-3">
          <select v-model="status" class="form-select form-select-sm">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="delay">Delay</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card shadow-sm border-0">
      <div
        class="table-responsive progress-table-wrap"
        style="max-height: min(70vh, 720px)"
      >
        <table class="table table-sm table-hover align-middle mb-0 progress-table">
          <thead
            class="table-light position-sticky top-0 z-1 shadow-sm"
            style="z-index: 2"
          >
            <tr>
              <th class="bg-light" style="width: 50px">No</th>
              <th class="bg-light">Project</th>
              <th class="bg-light">Detail</th>
              <th
                v-for="s in stageColumns"
                :key="s.id"
                class="bg-light small text-center progress-stage-col"
              >
                <div class="fw-semibold">{{ s.name }}</div>
                <div class="stage-header-caption text-muted">
                  plan ({{ stageDateCounts[s.code]?.plan ?? 0 }}) -
                  actual ({{ stageDateCounts[s.code]?.actual ?? 0 }})
                </div>
              </th>
              <th class="bg-light" style="min-width: 140px">Status</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td :colspan="tableColspan" class="text-center py-5 text-muted">
                Loading…
              </td>
            </tr>

            <tr v-for="(item, index) in store.items" :key="item.id">
              <td class="text-center small fw-semibold">
                {{ (store.page - 1) * store.limit + index + 1 }}
              </td>

              <td class="small progress-main-col">
                <div class="fw-semibold" style="font-size: 0.95rem">
                  {{ item.projectName || "—" }}
                </div>
                <div class="data-meta mt-1">
                  <span class="label-prefix">PO</span
                  >{{ item.poNumber?.trim() || "—" }}
                </div>
                <div class="data-meta">
                  <span class="label-prefix">Material</span
                  >{{ item.materialName || "—" }}
                </div>
              </td>

              <td class="small progress-main-col">
                <div class="fw-semibold" style="font-size: 0.95rem">
                  <NuxtLink
                    v-if="canEdit"
                    :to="`/project-progress/update?id=${item.id}`"
                    class="text-primary text-decoration-none"
                  >
                    {{ item.siteName || "—" }}
                  </NuxtLink>
                  <span v-else>{{ item.siteName || "—" }}</span>
                </div>
                <div class="data-meta mt-1">
                  <span class="label-prefix">ID</span
                  >{{ item.siteId?.trim() || "—" }}
                </div>
                <div class="data-meta">
                  <span class="label-prefix">SK</span
                  >{{ item.systemKey?.trim() || "—" }}
                </div>
                <div class="data-meta">
                  <span class="label-prefix">NI</span
                  >{{ item.neId?.trim() || "—" }}
                </div>
                <NuxtLink
                  v-if="item.projectDetailId"
                  :to="`/project-details/update?id=${item.projectDetailId}`"
                  class="d-inline-block mt-2 small text-decoration-none"
                >
                  → Edit detail
                </NuxtLink>
              </td>

              <td
                v-for="s in stageColumns"
                :key="s.id"
                class="small progress-stage-cell text-center progress-stage-col"
              >
                <div class="progress-stage-dates">
                  <div class="progress-stage-date-row">
                    <span class="progress-stage-date-label">Plan</span>
                    <span class="fw-medium">
                      {{ formatDateDMY(item.stageData?.[s.code]?.plan_submit_date) }}
                    </span>
                  </div>
                  <div class="progress-stage-date-row">
                    <span class="progress-stage-date-label">Actual</span>
                    <span class="fw-medium">
                      {{ formatDateDMY(item.stageData?.[s.code]?.actual_approve_date) }}
                    </span>
                  </div>
                </div>
              </td>

              <td class="small" style="min-width: 140px; white-space: normal">
                <div>
                  <span
                    class="badge"
                    :class="detailStatusBadgeClass(item.detailStatus)"
                  >
                    {{ detailStatusLabel(item.detailStatus) }}
                  </span>
                </div>
                <div class="data-meta mt-1">
                  <div>Created: {{ formatListTimestamp(item.createdAt) }}</div>
                  <div>Updated: {{ formatListTimestamp(item.updatedAt) }}</div>
                </div>
                <div v-if="canDelete" class="mt-1">
                  <span
                    class="text-danger small fw-semibold"
                    style="cursor: pointer"
                    @click.stop="handleDelete(item.id, item.siteName)"
                  >
                    x
                  </span>
                </div>
              </td>
            </tr>

            <tr v-if="!loading && store.items.length === 0">
              <td :colspan="tableColspan" class="text-center text-muted py-5">
                No data
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3"
    >
      <div class="data-meta">
        Showing
        {{ showingStart }}
        –
        {{ showingEnd }}
        of {{ store.total }} entries
      </div>

      <AppPagination
        :current-page="store.page"
        :total-pages="store.totalPages"
        @prev="prevPage"
        @next="nextPage"
      />
    </div>

    <!-- Delete confirmation modal (simple, controlled) -->
    <div
      v-if="showDeleteModal"
      class="modal d-block"
      tabindex="-1"
      style="background: rgba(0, 0, 0, 0.45)"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirm delete</h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              @click="cancelDelete"
            ></button>
          </div>
          <div class="modal-body">
            <p>
              Delete project progress for site
              <strong>{{ deleteTargetLabel }}</strong
              >?
            </p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="cancelDelete"
            >
              Cancel
            </button>
            <button type="button" class="btn btn-danger" @click="performDelete">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress-table-wrap {
  border-radius: 0.375rem;
}

.progress-table {
  table-layout: fixed;
  min-width: 2200px;
}

.progress-main-col {
  min-width: 30rem;
  max-width: 36rem;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.progress-stage-cell {
  vertical-align: middle;
}

/* Pembatas antar kolom tahap (mudah bedakan plan–actual tiap stage) */
.progress-table-wrap .progress-stage-col {
  border-left: 2px solid var(--bs-border-color);
  padding-left: 0.65rem;
  padding-right: 0.65rem;
  min-width: 11.5rem;
}

.stage-header-caption {
  font-size: 0.65rem;
  font-weight: normal;
  letter-spacing: 0.02em;
  margin-top: 0.2rem;
  line-height: 1.2;
  opacity: 0.9;
}

.progress-stage-dates {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  white-space: normal;
  text-align: left;
}

.progress-stage-date-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  line-height: 1.2;
  min-width: 100%;
}

.progress-stage-date-label {
  color: #6c757d;
  font-size: 0.72rem;
  font-weight: 500;
  min-width: 2.9rem;
}
</style>
