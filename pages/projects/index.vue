<script setup lang="ts">
import { useProjectsListPage } from "@/composables/useProjectsListPage";

definePageMeta({});

const {
  store,
  canCreate,
  canEdit,
  canDelete,
  expandedRow,
  deletingId,
  showDeleteModal,
  deleteTargetProject,
  searchFilter,
  statusFilter,
  showingStart,
  showingEnd,
  openDeleteModal,
  cancelDelete,
  performDelete,
  nextPage,
  prevPage,
  toggleRow,
  getRowNumber,
  formatCurrency,
} = useProjectsListPage();
</script>

<template>
  <div class="container py-4">
    <!-- HEADER -->
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">Projects</h4>

      <NuxtLink v-if="canCreate" to="/projects/create" class="btn btn-primary">
        + New Project
      </NuxtLink>
    </div>

    <!-- FILTER -->
    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2">
        <div class="col-md-4">
          <input
            v-model="searchFilter"
            type="text"
            class="form-control"
            placeholder="Search"
          />
        </div>

        <div class="col-md-3">
          <select v-model="statusFilter" class="form-select">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
    </div>

    <!-- TABLE -->
    <div class="card shadow-sm border-0">
      <div class="card-body p-0">
        <div class="table-wrapper">
          <table class="table table-striped table-users mb-0">
            <thead class="table-light">
              <tr>
                <th class="text-center" width="64">No</th>
                <th>Project / PO Number</th>
                <th>PO Date</th>
                <th>Delivery</th>
                <th>KOM</th>
                <th class="text-end">HPP</th>
                <th class="text-end">DPP</th>
                <th class="text-end">MRG</th>
                <th class="text-end">PO Price</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <!-- LOADING -->
              <tr v-if="store.loading">
                <td colspan="10" class="text-center py-3">Loading...</td>
              </tr>

              <template v-for="(item, index) in store.items" :key="item.id">
                <!-- MAIN ROW -->
                <tr>
                  <td
                    class="text-center text-muted fw-semibold"
                    style="cursor: pointer"
                    @click="toggleRow(item.id)"
                  >
                    {{ getRowNumber(index) }}
                  </td>

                  <td>
                    <NuxtLink
                      v-if="canEdit"
                      :to="`/projects/update?id=${item.id}`"
                      class="text-primary fw-semibold text-decoration-none"
                    >
                      {{ item.projectName }}
                    </NuxtLink>

                    <span v-else>
                      {{ item.projectName }}
                    </span>
                    <div class="data-meta mt-1">
                      <span class="label-prefix">PO</span>{{ item.poNumber || "-" }}
                    </div>
                  </td>
                  <td>{{ item.poDate }}</td>
                  <td>{{ item.deliveryDate }}</td>
                  <td>{{ item.komDate }}</td>
                  <td class="text-end">{{ formatCurrency(item.hpp) }}</td>
                  <td class="text-end">{{ formatCurrency(item.dpp) }}</td>
                  <td class="text-end">{{ Number(item.mrg || 0).toFixed(2) }}%</td>

                  <td class="text-end">
                    {{ formatCurrency(item.subTotal) }}
                  </td>

                  <!-- STATUS + DELETE -->
                  <td>
                    <span
                      class="badge me-2"
                      :class="{
                        'bg-success': item.status === 'active',
                        'bg-secondary': item.status === 'closed',
                        'bg-danger': item.status === 'cancelled',
                      }"
                    >
                      {{ item.status }}
                    </span>

                    <div class="data-meta mt-1">
                      <div>Created: {{ item.createdAt || "-" }}</div>
                      <div>Updated: {{ item.updatedAt || "-" }}</div>
                    </div>

                    <span
                      v-if="canDelete"
                      class="text-danger fw-semibold"
                      style="cursor: pointer"
                      @click.stop="openDeleteModal(item.id)"
                    >
                      <span v-if="deletingId === item.id">...</span>
                      <span v-else>x</span>
                    </span>
                  </td>
                </tr>

                <!-- EXPANDED DETAIL -->
                <tr v-if="expandedRow === item.id" class="bg-light">
                  <td colspan="10">
                    <div class="p-4">
                      <div class="row">
                        <!-- LEFT SIDE : PROJECT INFO -->
                        <div class="col-md-6">
                          <div class="mb-3">
                            <div class="data-label">Contract</div>
                            <div class="data-value">
                              {{ item.contractNumber || "-" }}
                            </div>
                          </div>

                          <div class="mb-3">
                            <div class="data-label">PR / SC</div>
                            <div class="data-value">
                              {{ item.prScNumber || "-" }}
                            </div>
                          </div>

                          <div class="mb-4">
                            <div class="data-label">Project Manager</div>
                            <div class="data-value">{{ item.pm || "-" }}</div>
                          </div>

                          <div class="data-meta mt-3">
                            Created: {{ item.createdAt || "-" }}
                          </div>
                          <div class="data-meta">
                            Updated: {{ item.updatedAt || "-" }}
                          </div>
                        </div>

                        <!-- RIGHT SIDE : FINANCIAL -->
                        <div class="col-md-6">
                          <div class="border rounded p-3 bg-white">
                            <div class="d-flex justify-content-between mb-2">
                              <span class="data-label fw-normal mb-0"
                                >Subtotal</span
                              >
                              <span>{{ formatCurrency(item.subTotal) }}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                              <span class="data-label fw-normal mb-0">HPP</span>
                              <span>{{ formatCurrency(item.hpp) }}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                              <span class="data-label fw-normal mb-0">DPP</span>
                              <span>{{ formatCurrency(item.dpp) }}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                              <span class="data-label fw-normal mb-0">MRG</span>
                              <span>{{ Number(item.mrg || 0).toFixed(2) }}%</span>
                            </div>

                            <div class="d-flex justify-content-between mb-2">
                              <span class="data-label fw-normal mb-0"
                                >Discount</span
                              >
                              <span class="text-danger">
                                - {{ formatCurrency(item.discount) }}
                              </span>
                            </div>

                            <div class="d-flex justify-content-between mb-2">
                              <span class="data-label fw-normal mb-0">VAT</span>
                              <span>{{ formatCurrency(item.vatAmount) }}</span>
                            </div>

                            <hr />

                            <div
                              class="d-flex justify-content-between fw-bold fs-5"
                            >
                              <span>Grand Total</span>
                              <span class="text-brand">
                                {{ formatCurrency(item.grandTotal) }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>

              <!-- EMPTY -->
              <tr v-if="!store.loading && store.items.length === 0">
                <td colspan="10" class="text-center text-muted py-3">
                  No data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PAGINATION -->
    <div
      v-if="store.meta"
      class="d-flex justify-content-between align-items-center mt-3"
    >
      <div>
        <div class="data-meta">
          Showing
          {{ showingStart }}
          -
          {{ showingEnd }}
          of {{ store.meta.total }} entries
        </div>
      </div>

      <div v-if="store.meta.totalPages > 1">
        <button
          class="btn btn-outline-secondary me-2"
          :disabled="store.meta.page === 1"
          @click="prevPage"
        >
          Prev
        </button>

        <span class="me-2">
          Page {{ store.meta.page }} of
          {{ store.meta.totalPages }}
        </span>

        <button
          class="btn btn-outline-secondary"
          :disabled="store.meta.page >= store.meta.totalPages"
          @click="nextPage"
        >
          Next
        </button>
      </div>
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
                deleteTargetProject?.projectName || "this project"
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

<style scoped lang="scss">
.table-users {
  th,
  td {
    font-size: 0.9rem;
  }
}
</style>
