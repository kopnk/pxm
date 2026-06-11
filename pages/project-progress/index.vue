<script setup lang="ts">
import { formatListTimestamp } from "@/utils/formatListTimestamp";
import {
  detailStatusBadgeClass,
  detailStatusLabel,
} from "~/lib/detailStatus";
import { useProjectProgressListPage } from "@/composables/useProjectProgressListPage";

const formatDateDMY = (val?: string | null) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const {
  store,
  canCreate,
  canEdit,
  canDelete,
  canCreateProjectProgress,
  exporting,
  searchFilter,
  stageFilter,
  stageDateTypeFilter,
  statusFilter,
  showDeleteModal,
  deleteTargetLabel,
  stageColumns,
  stageFilterOptions,
  stageDateTypeEnabled,
  stageDateCounts,
  tableColspan,
  onExportExcel,
  handleDelete,
  performDelete,
  cancelDelete,
  prevPage,
  nextPage,
  showingStart,
  showingEnd,
} = useProjectProgressListPage();
</script>

<template>
  <div class="container-fluid py-4 px-3">
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
      <div
        class="card-body d-flex flex-nowrap align-items-center gap-2 py-2 px-2 pp-filter-one-line"
      >
        <input
          v-model="searchFilter"
          type="search"
          class="form-control form-control-sm pp-filter-search"
          placeholder="Project, PO, site…"
        />
        <select
          v-model="stageFilter"
          class="form-select form-select-sm flex-shrink-0 pp-filter-stage"
        >
          <option value="">All Stages</option>
          <option
            v-for="opt in stageFilterOptions"
            :key="opt.code"
            :value="opt.code"
          >
            {{ opt.label }}
          </option>
        </select>
        <select
          v-model="stageDateTypeFilter"
          class="form-select form-select-sm flex-shrink-0 pp-filter-date-type"
          :disabled="!stageDateTypeEnabled"
        >
          <option value="">Plan / Actual</option>
          <option value="planned">Planned</option>
          <option value="actual">Actual</option>
        </select>
        <select
          v-model="statusFilter"
          class="form-select form-select-sm flex-shrink-0 pp-filter-status"
        >
          <option value="">All Status</option>
          <option disabled>-- Detail Status --</option>
          <option value="detail:active">Active</option>
          <option value="detail:delay">Delay</option>
          <option value="detail:closed">Closed</option>
          <option value="detail:cancelled">Cancelled</option>
          <option disabled>-- Stage Status --</option>
          <option value="stage:pending">Pending</option>
          <option value="stage:submitted">Submitted</option>
          <option value="stage:approved">Approved</option>
          <option value="stage:delayed">Delayed</option>
          <option value="stage:cancelled">Cancelled</option>
        </select>
        <span class="text-secondary user-select-none flex-shrink-0" aria-hidden="true"></span>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm text-nowrap flex-shrink-0 ms-auto"
          :disabled="exporting"
          aria-label="Download Excel for current search and filters"
          @click="onExportExcel"
        >
          {{ exporting ? "…" : "Excel" }}
        </button>
      </div>
    </div>

    <div class="card shadow-sm border-0">
      <div class="card-body p-0">
        <div class="table-scroll-x">
          <table
            class="table table-sm table-hover table-users align-middle mb-0 progress-table"
          >
            <thead class="table-light">
              <tr>
                <th style="width: 50px">No</th>
                <th>Project</th>
                <th>Detail</th>
                <th
                  v-for="s in stageColumns"
                  :key="s.id"
                  class="small text-center progress-stage-col"
                >
                <div class="fw-semibold">{{ s.name }}</div>
                <div class="stage-header-caption text-muted">
                  plan ({{ stageDateCounts[s.code]?.plan ?? 0 }}) -
                  actual ({{ stageDateCounts[s.code]?.actual ?? 0 }})
                </div>
              </th>
                <th style="min-width: 140px">Status</th>
              </tr>
            </thead>

          <tbody>
            <tr v-if="store.loading">
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
                    <span class="progress-stage-date-value">
                      {{ formatDateDMY(item.stageData?.[s.code]?.plan_submit_date) }}
                    </span>
                  </div>
                  <div class="progress-stage-date-row">
                    <span class="progress-stage-date-label">Actual</span>
                    <span class="progress-stage-date-value">
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
                  <div>Created by: {{ item.createdBy || "-" }}</div>
                  <div>Updated by: {{ item.updatedBy || "-" }}</div>
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

            <tr v-if="!store.loading && store.items.length === 0">
              <td :colspan="tableColspan" class="text-center text-muted py-5">
                No data
              </td>
            </tr>
          </tbody>
          </table>
        </div>
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
/* Satu baris: search boleh menyusut (min-width:0); baris bisa scroll horizontal di layar sempit */
.pp-filter-one-line {
  overflow-x: auto;
  scrollbar-width: thin;
}

.pp-filter-search {
  min-width: 0;
  flex: 1 1 24rem;
  max-width: 48rem;
}

.pp-filter-stage {
  width: 9.5rem;
  min-width: 9.5rem;
}

.pp-filter-date-type {
  width: 8.5rem;
  min-width: 8.5rem;
}

.pp-filter-status {
  width: 10.5rem;
  min-width: 10.5rem;
}

.table-scroll-x {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
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
.progress-stage-col {
  border-left: 2px solid var(--bs-border-color);
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  min-width: 10.5rem;
  max-width: 10.5rem;
  overflow: hidden;
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
  gap: 0.25rem;
  line-height: 1.15;
  width: 100%;
  min-width: 0;
}

.progress-stage-date-label {
  color: #6c757d;
  font-size: 0.68rem;
  font-weight: 500;
  flex: 0 0 2.35rem;
}

.progress-stage-date-value {
  font-size: 0.72rem;
  font-weight: 500;
  color: #212529;
  line-height: 1.15;
  min-width: 0;
  white-space: nowrap;
}
</style>
