<script setup lang="ts">
import { useProjectDetailsListPage } from "@/composables/useProjectDetailsListPage";

const {
  store,
  canCreate,
  canEdit,
  canDelete,
  search,
  status,
  statusOptions,
  deletingId,
  deleteTarget,
  showDeleteModal,
  showingStart,
  showingEnd,
  prevPage,
  nextPage,
  openDeleteModal,
  cancelDelete,
  performDelete,
  formatCurrency,
  getRowNumber,
  getStatusBadgeClass,
} = useProjectDetailsListPage();
</script>

<template>
  <div class="container py-4">
    <!-- HEADER -->
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">Project Details</h4>

      <NuxtLink
        v-if="canCreate"
        to="/project-details/create"
        class="btn btn-primary"
      >
        + New Project Details
      </NuxtLink>
    </div>

    <!-- FILTER (SAMA DENGAN CLIENTS) -->
    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2">
        <div class="col-md-4">
          <input v-model="search" class="form-control" placeholder="Search" />
        </div>

        <div class="col-md-3">
          <select v-model="status" class="form-select">
            <option
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- TABLE (STYLE CLIENTS) -->
    <div class="card shadow-sm border-0">
      <div class="card-body p-0">
        <!-- WRAP TABLE:
             - browser/page tidak melebar
             - horizontal scroll hanya terjadi pada area tabel -->
        <div class="table-scroll-x">
          <table class="table table-striped table-users mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 50px">No</th>
                <th>Project Name</th>
                <th>Region</th>
                <th>Line</th>
                <th>Detail</th>
                <th>Qty / UOM</th>
                <th class="text-center">Unit / Total Price</th>
                <th>PIC</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="store.loading">
                <td colspan="9" class="text-center py-3">Loading...</td>
              </tr>

              <tr v-for="(item, index) in store.items" :key="item.id">
                <!-- No -->
                <td class="text-center fw-semibold align-middle">
                  {{ getRowNumber(index) }}
                </td>

                <!-- PO / Project Name / Material -->
                <td style="min-width: 220px">
                  <div class="fw-semibold" style="font-size: 0.95rem">
                    {{ item.projectName }}
                  </div>
                  <div class="data-meta" style="margin-top: 0.5rem">
                    <span class="label-prefix">PO</span>{{ item.poNumber }}
                  </div>
                  <div class="data-meta">
                    <span class="label-prefix">Material</span
                    >{{ item.materialName || "-" }}
                  </div>
                </td>

                <!-- Region / Sub Region -->
                <td style="min-width: 180px">
                  <div class="fw-semibold">
                    {{ item.regionName || "-" }}
                  </div>
                  <div class="small text-muted">
                    {{ item.subRegionName || "-" }}
                  </div>
                </td>

                <!-- Line -->
                <td>{{ item.lineNumber ?? "-" }}</td>

                <!-- System Key / NE / Site Info -->
                <td style="min-width: 200px">
                  <div
                    class="fw-semibold"
                    style="margin-top: 0.5rem; font-size: 0.95rem"
                  >
                    <NuxtLink
                      v-if="canEdit"
                      :to="`/project-details/update?id=${item.id}`"
                      class="text-primary fw-semibold text-decoration-none"
                    >
                      {{ item.siteName }}
                    </NuxtLink>
                    <span v-else>
                      {{ item.siteName }}
                    </span>
                  </div>
                  <div class="data-meta">
                    <span class="label-prefix">ID</span>{{ item.siteId }}
                  </div>
                  <div class="data-meta">
                    <span class="label-prefix">SK</span>{{ item.systemkey }}
                  </div>
                  <div class="data-meta">
                    <span class="label-prefix">NI</span>{{ item.neId }}
                  </div>
                </td>

                <!-- Qty / UOM -->
                <td class="text-center">
                  <div class="fw-semibold">{{ item.quantity }}</div>
                  <div class="data-meta">{{ item.uom }}</div>
                </td>

                <!-- Unit Price / Total Price -->
                <td class="text-center" style="min-width: 160px">
                  <div class="fw-semibold">
                    {{ formatCurrency(item.unitPrice) }}
                  </div>
                  <small class="fw-semibold text-success">{{
                    formatCurrency(item.totalPrice)
                  }}</small>
                </td>

                <!-- PIC -->
                <td>{{ item.picArea }}</td>

                <!-- Status -->
                <td style="min-width: 140px">
                  <div>
                    <span
                      class="badge"
                      :class="getStatusBadgeClass(item.status)"
                    >
                      {{ item.status }}
                    </span>
                  </div>

                  <div class="small text-muted mt-1">
                    <div>Created: {{ item.createdAt }}</div>
                    <div>Updated: {{ item.updatedAt }}</div>
                  </div>

                  <div v-if="canDelete" class="mt-1">
                    <span
                      class="text-danger small fw-semibold"
                      style="cursor: pointer"
                      @click.stop="openDeleteModal(item.id)"
                    >
                      {{ deletingId === item.id ? "..." : "x" }}
                    </span>
                  </div>
                </td>
              </tr>

              <tr v-if="!store.loading && store.items.length === 0">
                <td colspan="9" class="text-center text-muted py-3">
                  No data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PAGINATION (STYLE CLIENTS) -->
    <div
      v-if="store.total > 0"
      class="d-flex justify-content-between align-items-center mt-3"
    >
      <div>
        <div class="data-meta">
          Showing
          {{ showingStart }}
          -
          {{ showingEnd }}
          of {{ store.total }} entries
        </div>
      </div>

      <AppPagination
        :current-page="store.page"
        :total-pages="store.totalPages"
        @prev="prevPage"
        @next="nextPage"
      />
    </div>

    <!-- DELETE MODAL -->
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
              :disabled="!!deletingId"
              @click="cancelDelete"
            ></button>
          </div>

          <div class="modal-body">
            <p class="mb-0">
              Delete
              <span class="fw-bold">{{
                deleteTarget?.siteName || "this project detail"
              }}</span
              >?
            </p>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              :disabled="!!deletingId"
              @click="cancelDelete"
            >
              Cancel
            </button>

            <button
              type="button"
              class="btn btn-danger"
              :disabled="!!deletingId"
              @click="performDelete"
            >
              {{ deletingId ? "Deleting..." : "Delete" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* REMARK:
   `table-scroll-x` memastikan lebar halaman tetap aman.
   Jika kolom tabel lebih banyak dari viewport, scroll hanya di dalam wrapper ini. */
.table-scroll-x {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

/* REMARK:
   min-width mencegah kolom saling menumpuk saat layar sempit,
   sehingga user cukup scroll horizontal pada area tabel. */
.table-users {
  min-width: 1400px;
}
</style>
