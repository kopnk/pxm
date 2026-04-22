<script setup lang="ts">
import { useProjectFinancialsListPage } from "@/composables/useProjectFinancialsListPage";
import {
  pfPartnerLineTotal,
  pfClientLineTotal,
  pfFormatIdDate,
  pfListLineBase,
  pfPartnerTaxRupiahForDisplay,
  pfClientTaxRupiahForDisplay,
} from "@/composables/useProjectFinancialsDisplay";

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
  formatCurrencyIdr,
  formatQty,
  formatListTimestamp,
  getRowNumber,
  getFinancialStatusBadgeClass,
  formatFinancialStatusLabel,
  deleteModalLabel,
} = useProjectFinancialsListPage();
</script>

<template>
  <div class="container-fluid py-4 px-3">
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">Project Financials</h4>
      <NuxtLink
        v-if="canCreate"
        to="/project-financials/create"
        class="btn btn-primary"
      >
        + New Financial
      </NuxtLink>
    </div>

    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2">
        <div class="col-md-4">
          <input
            v-model="search"
            class="form-control"
            placeholder="Search"
          />
        </div>
        <div class="col-md-3">
          <select v-model="status" class="form-select">
            <option
              v-for="option in statusOptions"
              :key="option.value === '' ? 'all' : option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="card shadow-sm border-0">
      <div class="card-body p-0">
        <div class="table-scroll-x">
          <table
            class="table table-striped table-sm mb-0 align-top table-financials"
          >
            <thead class="table-light">
              <tr>
                <th class="text-center text-nowrap" style="width: 50px">No</th>
                <th>Description</th>
                <th>Detail</th>
                <th class="col-partner">Partner Details</th>
                <th class="col-client">Client Details</th>
                <th style="min-width: 140px">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="store.loading">
                <td colspan="6" class="text-center py-3">Loading…</td>
              </tr>

              <template v-else>
                <tr v-for="(item, idx) in store.items" :key="item.id">
                  <td class="text-center data-meta">
                    {{ getRowNumber(idx) }}
                  </td>
                  <td class="fin-desc">
                    <div class="fw-semibold" style="font-size: 0.95rem">
                      {{ item.projectPoNumber || "—" }}
                    </div>
                    <div>{{ item.projectName || "—" }}</div>
                    <div class="data-meta">
                      {{ item.detailMaterialName || "—" }}
                    </div>
                  </td>
                  <td class="fin-site">
                    <div class="fw-semibold" style="font-size: 0.95rem">
                      <NuxtLink
                        v-if="canEdit"
                        :to="`/project-financials/update?id=${item.id}`"
                        class="text-primary fw-semibold text-decoration-none"
                      >
                        {{ item.detailSiteName || "—" }}
                      </NuxtLink>
                      <span v-else>{{ item.detailSiteName || "—" }}</span>
                    </div>
                    <div class="data-meta mt-1">
                      <span class="label-prefix">ID</span
                      >{{ item.detailSiteId || "—" }}
                    </div>
                    <div class="data-meta">
                      <span class="label-prefix">SK</span
                      >{{ item.detailSystemkey || "—" }}
                    </div>
                    <div class="data-meta">
                      <span class="label-prefix">NI</span
                      >—
                    </div>
                  </td>
                  <td class="fin-stack small col-partner">
                    <template v-if="item.flowDirection === 'in'">
                      <div class="fin-line">
                        <span class="text-muted">Qty</span>
                        {{ formatQty(item.qtyPartner) }}
                        <span class="text-muted ms-2">Price</span>
                        {{ formatCurrencyIdr(item.unitPricePartner) }}
                      </div>
                      <div class="fin-line data-meta">
                        <span class="text-muted">Line base</span>
                        {{
                          formatCurrencyIdr(
                            pfListLineBase(
                              item.qtyPartner,
                              item.unitPricePartner,
                            ),
                          )
                        }}
                        <span class="ms-1">(Qty × Price)</span>
                      </div>
                      <div class="fin-line">
                        <span class="text-muted">PPH</span>
                        {{
                          formatCurrencyIdr(
                            pfPartnerTaxRupiahForDisplay(
                              item.qtyPartner,
                              item.unitPricePartner,
                              item.pph,
                            ),
                          )
                        }}
                        <span class="text-muted ms-2">Tax In</span>
                        {{
                          formatCurrencyIdr(
                            pfPartnerTaxRupiahForDisplay(
                              item.qtyPartner,
                              item.unitPricePartner,
                              item.taxIn,
                            ),
                          )
                        }}
                      </div>
                      <div class="fin-line fw-semibold">
                        <span class="text-muted">Total</span>
                        {{
                          formatCurrencyIdr(
                            pfPartnerLineTotal(
                              item.qtyPartner,
                              item.unitPricePartner,
                              item.pph,
                              item.taxIn,
                            ),
                          )
                        }}
                      </div>
                      <hr class="my-1 opacity-25" />
                      <div class="fin-line">
                        <span class="text-muted">PO</span>
                        {{ item.poNumberPartner || "—" }}
                        <span class="text-muted ms-2">Date</span>
                        {{ pfFormatIdDate(item.poDatePartner) }}
                      </div>
                      <div class="fin-line">
                        <span class="text-muted">Invoice</span>
                        {{ item.invoiceNumberPartner || "—" }}
                        <span class="text-muted ms-2">Date</span>
                        {{ pfFormatIdDate(item.invoiceDatePartner) }}
                      </div>
                      <div class="fin-line">
                        <span class="text-muted">FP</span>
                        {{ item.fpNumberPartner || "—" }}
                        <span class="text-muted ms-2">Date</span>
                        {{ pfFormatIdDate(item.fpDatePartner) }}
                      </div>
                      <div class="fin-line">
                        <span class="text-muted">Balap</span>
                        {{ item.balapNumber || "—" }}
                        <span class="text-muted ms-2">Date</span>
                        {{ pfFormatIdDate(item.balapDate) }}
                      </div>
                      <div class="fin-line">
                        <span class="text-muted">BAST</span>
                        {{ item.bastNumber || "—" }}
                        <span class="text-muted ms-2">Date</span>
                        {{ pfFormatIdDate(item.bastDate) }}
                      </div>
                      <div class="fin-line mt-1">
                        <span class="text-muted">Partner</span>
                        {{ item.partnerName || "—" }}
                      </div>
                    </template>
                  </td>
                  <td class="fin-stack small col-client">
                    <template v-if="item.flowDirection === 'out'">
                      <div class="fin-line">
                        <span class="text-muted">Qty</span>
                        {{ formatQty(item.qtyClient) }}
                        <span class="text-muted ms-2">Price</span>
                        {{ formatCurrencyIdr(item.unitPriceClient) }}
                      </div>
                      <div class="fin-line data-meta">
                        <span class="text-muted">Line base</span>
                        {{
                          formatCurrencyIdr(
                            pfListLineBase(
                              item.qtyClient,
                              item.unitPriceClient,
                            ),
                          )
                        }}
                        <span class="ms-1">(Qty × Price)</span>
                      </div>
                      <div class="fin-line">
                        <span class="text-muted">Tax Out</span>
                        {{
                          formatCurrencyIdr(
                            pfClientTaxRupiahForDisplay(
                              item.qtyClient,
                              item.unitPriceClient,
                              item.taxOut,
                            ),
                          )
                        }}
                      </div>
                      <div class="fin-line fw-semibold">
                        <span class="text-muted">Total</span>
                        {{
                          formatCurrencyIdr(
                            pfClientLineTotal(
                              item.qtyClient,
                              item.unitPriceClient,
                              item.taxOut,
                            ),
                          )
                        }}
                      </div>
                      <hr class="my-1 opacity-25" />
                      <div class="fin-line">
                        <span class="text-muted">PO</span>
                        {{ item.poNumberClient || "—" }}
                        <span class="text-muted ms-2">Date</span>
                        {{ pfFormatIdDate(item.poDateClient) }}
                      </div>
                      <div class="fin-line">
                        <span class="text-muted">Invoice</span>
                        {{ item.invoiceNumberClient || "—" }}
                        <span class="text-muted ms-2">Date</span>
                        {{ pfFormatIdDate(item.invoiceDateClient) }}
                      </div>
                      <div class="fin-line">
                        <span class="text-muted">FP</span>
                        {{ item.fpNumberClient || "—" }}
                        <span class="text-muted ms-2">Date</span>
                        {{ pfFormatIdDate(item.fpDateClient) }}
                      </div>
                      <div class="fin-line">
                        <span class="text-muted">BAST</span>
                        {{ item.bastNumber || "—" }}
                        <span class="text-muted ms-2">Date</span>
                        {{ pfFormatIdDate(item.bastDate) }}
                      </div>
                      <div class="fin-line">
                        <span class="text-muted">Balap</span>
                        {{ item.balapNumber || "—" }}
                        <span class="text-muted ms-2">Date</span>
                        {{ pfFormatIdDate(item.balapDate) }}
                      </div>
                      <div class="fin-line mt-1">
                        <span class="text-muted">Client</span>
                        {{ item.clientName || "—" }}
                      </div>
                    </template>
                  </td>
                  <td>
                    <div>
                      <span
                        class="badge"
                        :class="getFinancialStatusBadgeClass(item.status)"
                      >
                        {{ formatFinancialStatusLabel(item.status) }}
                      </span>
                    </div>
                    <div class="data-meta mt-1">
                      <div>
                        Created: {{ formatListTimestamp(item.createdAt) }}
                      </div>
                      <div>
                        Updated: {{ formatListTimestamp(item.updatedAt) }}
                      </div>
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
              </template>

              <tr v-if="!store.loading && store.items.length === 0">
                <td colspan="6" class="text-center text-muted py-3">
                  No data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div
      v-if="store.total > 0"
      class="d-flex justify-content-between align-items-center mt-3"
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
              <span class="fw-bold">{{ deleteModalLabel(deleteTarget) }}</span
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
.table-scroll-x {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.table-financials {
  min-width: 1100px;

  th {
    vertical-align: middle;
    font-size: 0.8rem;
  }

  .col-partner,
  .col-client {
    min-width: 280px;
    max-width: 340px;
  }

  .fin-desc {
    min-width: 160px;
    max-width: 220px;
  }

  .fin-site {
    min-width: 140px;
    max-width: 200px;
  }

  .fin-stack .fin-line {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 0.35rem;
    row-gap: 0.05rem;
    line-height: 1.3;
  }

  .fin-stack .text-muted {
    display: inline;
    min-width: auto;
    margin-right: 0;
  }

  .fin-stack .fin-line > .text-muted:first-child {
    min-width: 2.75rem;
  }
}
</style>
