<script setup lang="ts">
import { computed } from "vue";
import { useProjectFinancialsListPage } from "@/composables/useProjectFinancialsListPage";
import { useProjectFinancialsExport } from "@/composables/useProjectFinancialsExport";
import {
  pfPartnerLineTotal,
  pfClientLineTotal,
  pfFormatIdDate,
  pfListLineBase,
  pfPartnerTaxRupiahForDisplay,
  pfClientTaxRupiahForDisplay,
} from "@/lib/projectFinancialsMath";
import type { ProjectFinancialItem } from "@/stores/projectFinancials";

const {
  store,
  canCreate,
  canEdit,
  canDelete,
  search,
  status,
  flowDirection,
  statusOptions,
  flowDirectionOptions,
  showPartnerLineTotal,
  showClientLineTotal,
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

const { exporting, downloadExcel } = useProjectFinancialsExport();

const TABLE_COL_COUNT = 12;

const isInFlowFilter = computed(() => flowDirection.value === "in");
const isOutFlowFilter = computed(() => flowDirection.value === "out");

const poColumnLabel = computed(() => {
  if (isInFlowFilter.value) return "PO Partner";
  if (isOutFlowFilter.value) return "PO Client";
  return "PO";
});

const invoiceColumnLabel = computed(() => {
  if (isInFlowFilter.value) return "Invoice Partner";
  if (isOutFlowFilter.value) return "Invoice Client";
  return "Invoice";
});

const fpColumnLabel = computed(() => {
  if (isInFlowFilter.value) return "Tax In (FP)";
  if (isOutFlowFilter.value) return "Tax Out (FP)";
  return "FP";
});

const partyColumnLabel = computed(() => {
  if (isInFlowFilter.value) return "Partner";
  if (isOutFlowFilter.value) return "Client";
  return "Party";
});

const isRowIn = (item: ProjectFinancialItem) => item.flowDirection === "in";

const rowQty = (item: ProjectFinancialItem) =>
  isRowIn(item) ? item.qtyPartner : item.qtyClient;

const rowDpp = (item: ProjectFinancialItem) =>
  isRowIn(item)
    ? pfListLineBase(item.qtyPartner, item.unitPricePartner)
    : pfListLineBase(item.qtyClient, item.unitPriceClient);

const rowPph = (item: ProjectFinancialItem) =>
  pfPartnerTaxRupiahForDisplay(
    item.qtyPartner,
    item.unitPricePartner,
    item.pph,
  );

const rowTaxIn = (item: ProjectFinancialItem) =>
  pfPartnerTaxRupiahForDisplay(
    item.qtyPartner,
    item.unitPricePartner,
    item.taxIn,
  );

const rowTaxOut = (item: ProjectFinancialItem) =>
  pfClientTaxRupiahForDisplay(
    item.qtyClient,
    item.unitPriceClient,
    item.taxOut,
  );

const rowTotal = (item: ProjectFinancialItem) =>
  isRowIn(item)
    ? pfPartnerLineTotal(
        item.qtyPartner,
        item.unitPricePartner,
        item.pph,
        item.taxIn,
      )
    : pfClientLineTotal(item.qtyClient, item.unitPriceClient, item.taxOut);

const rowPoNumber = (item: ProjectFinancialItem) =>
  isRowIn(item) ? item.poNumberPartner : item.poNumberClient;

const rowPoDate = (item: ProjectFinancialItem) =>
  pfFormatIdDate(isRowIn(item) ? item.poDatePartner : item.poDateClient);

const rowInvoiceNumber = (item: ProjectFinancialItem) =>
  isRowIn(item) ? item.invoiceNumberPartner : item.invoiceNumberClient;

const rowInvoiceDate = (item: ProjectFinancialItem) =>
  pfFormatIdDate(
    isRowIn(item) ? item.invoiceDatePartner : item.invoiceDateClient,
  );

const rowFpNumber = (item: ProjectFinancialItem) =>
  isRowIn(item) ? item.fpNumberPartner : item.fpNumberClient;

const rowFpDate = (item: ProjectFinancialItem) =>
  pfFormatIdDate(isRowIn(item) ? item.fpDatePartner : item.fpDateClient);

const rowPartyName = (item: ProjectFinancialItem) =>
  isRowIn(item) ? item.partnerName : item.clientName;

const docPrimary = (value: string | null | undefined) =>
  value?.trim() ? value.trim() : "—";

const paidDocBlock = (
  label: string,
  no: string | null | undefined,
  date: string | null | undefined,
) => ({
  label,
  no: docPrimary(no),
  date: pfFormatIdDate(date),
});

const rowPaidBlocks = (item: ProjectFinancialItem) => {
  if (isRowIn(item)) {
    return [
      paidDocBlock("VB", item.vbNumber, item.vbDate),
      paidDocBlock("MCM", item.mcmNumber, item.mcmDate),
    ];
  }
  return [paidDocBlock("Paid", item.paidNumber, item.paidDate)];
};

const onExportExcel = () => {
  void downloadExcel({
    search: search.value,
    status: status.value,
    page: store.page,
    limit: store.limit,
  });
};
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
      <div
        class="card-body d-flex flex-nowrap align-items-center gap-2 gap-sm-3 py-2 px-2 pf-filter-one-line"
      >
        <input
          v-model="search"
          type="search"
          class="form-control form-control-sm flex-grow-1 flex-shrink-1 pf-filter-search"
          placeholder="PO, project, site, partner, client, invoice, PO partner/client…"
        />
        <select
          v-model="status"
          class="form-select form-select-sm flex-shrink-0 pf-filter-status"
        >
          <option
            v-for="option in statusOptions"
            :key="option.value === '' ? 'all' : option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <select
          v-model="flowDirection"
          class="form-select form-select-sm flex-shrink-0 pf-filter-flow"
        >
          <option
            v-for="option in flowDirectionOptions"
            :key="option.value === '' ? 'all-flow' : option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <span class="text-secondary user-select-none flex-shrink-0" aria-hidden="true">|</span>
        <span
          v-if="showPartnerLineTotal"
          class="text-nowrap flex-shrink-0 small text-muted"
        >
          Total Partner
          <span class="fw-semibold text-body ms-1">{{
            formatCurrencyIdr(store.listTotals.partnerLineIdr)
          }}</span>
        </span>
        <span
          v-if="showPartnerLineTotal && showClientLineTotal"
          class="text-secondary user-select-none flex-shrink-0"
          aria-hidden="true"
        >|</span>
        <span
          v-if="showClientLineTotal"
          class="text-nowrap flex-shrink-0 small text-muted"
        >
          Total Client
          <span class="fw-semibold text-body ms-1">{{
            formatCurrencyIdr(store.listTotals.clientLineIdr)
          }}</span>
        </span>
        <span class="text-secondary user-select-none flex-shrink-0" aria-hidden="true">|</span>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm text-nowrap flex-shrink-0 ms-auto"
          :disabled="exporting"
          aria-label="Download Excel for current search, status, and page"
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
            class="table table-striped table-sm mb-0 align-top table-financials"
          >
            <thead class="table-light">
              <tr>
                <th class="text-center text-nowrap fin-col-no">No</th>
                <th class="fin-desc">Description</th>
                <th class="fin-site">Detail</th>
                <th class="fin-col-qty text-end">Qty</th>
                <th class="fin-col-amount text-end">Amount</th>
                <th class="fin-col-doc">{{ poColumnLabel }}</th>
                <th class="fin-col-doc">{{ invoiceColumnLabel }}</th>
                <th class="fin-col-doc">{{ fpColumnLabel }}</th>
                <th class="fin-col-balap">Balap / BAST</th>
                <th class="fin-col-paid">Paid</th>
                <th class="fin-col-party">{{ partyColumnLabel }}</th>
                <th class="fin-col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="store.loading">
                <td :colspan="TABLE_COL_COUNT" class="text-center py-3">
                  Loading…
                </td>
              </tr>

              <template v-else>
                <tr v-for="(item, idx) in store.items" :key="item.id">
                  <td class="text-center data-meta fin-col-no">
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
                      <span class="label-prefix">NI</span>—
                    </div>
                  </td>
                  <td class="fin-col-qty text-end">
                    <div>{{ formatQty(rowQty(item)) }}</div>
                    <div class="data-meta">{{ item.detailUom || "—" }}</div>
                  </td>
                  <td class="fin-col-amount text-end fin-amount-stack">
                    <div>
                      <span class="label-prefix">{{
                        isRowIn(item) ? "HPP" : "DPP"
                      }}</span>
                      <span>{{ formatCurrencyIdr(rowDpp(item)) }}</span>
                    </div>
                    <template v-if="isRowIn(item)">
                      <div>
                        <span class="label-prefix">PPH</span>
                        <span>{{ formatCurrencyIdr(rowPph(item)) }}</span>
                      </div>
                      <div>
                        <span class="label-prefix">Tax In</span>
                        <span>{{ formatCurrencyIdr(rowTaxIn(item)) }}</span>
                      </div>
                    </template>
                    <div v-else>
                      <span class="label-prefix">Tax Out</span>
                      <span>{{ formatCurrencyIdr(rowTaxOut(item)) }}</span>
                    </div>
                    <div class="fw-semibold">
                      <span class="label-prefix">Total</span>
                      <span>{{ formatCurrencyIdr(rowTotal(item)) }}</span>
                    </div>
                  </td>
                  <td class="fin-col-doc fin-doc-cell">
                    <div class="fin-doc-block">
                      <div class="fin-doc-no">{{ docPrimary(rowPoNumber(item)) }}</div>
                      <div class="fin-doc-date">{{ rowPoDate(item) }}</div>
                    </div>
                  </td>
                  <td class="fin-col-doc fin-doc-cell">
                    <div class="fin-doc-block">
                      <div class="fin-doc-no">
                        {{ docPrimary(rowInvoiceNumber(item)) }}
                      </div>
                      <div class="fin-doc-date">{{ rowInvoiceDate(item) }}</div>
                    </div>
                  </td>
                  <td class="fin-col-doc fin-doc-cell">
                    <div class="fin-doc-block">
                      <div class="fin-doc-no">{{ docPrimary(rowFpNumber(item)) }}</div>
                      <div class="fin-doc-date">{{ rowFpDate(item) }}</div>
                    </div>
                  </td>
                  <td class="fin-col-balap fin-doc-cell">
                    <div class="fin-doc-block">
                      <div>
                        <span class="label-prefix">Balap</span>
                        <span class="fin-doc-no fin-doc-no-inline">{{
                          docPrimary(item.balapNumber)
                        }}</span>
                      </div>
                      <div class="fin-doc-date">{{ pfFormatIdDate(item.balapDate) }}</div>
                    </div>
                    <div class="fin-doc-block mt-1">
                      <div>
                        <span class="label-prefix">BAST</span>
                        <span class="fin-doc-no fin-doc-no-inline">{{
                          docPrimary(item.bastNumber)
                        }}</span>
                      </div>
                      <div class="fin-doc-date">{{ pfFormatIdDate(item.bastDate) }}</div>
                    </div>
                  </td>
                  <td class="fin-col-paid fin-doc-cell">
                    <div
                      v-for="(block, paidIdx) in rowPaidBlocks(item)"
                      :key="block.label"
                      class="fin-doc-block"
                      :class="{ 'mt-1': paidIdx > 0 }"
                    >
                      <div>
                        <span class="label-prefix">{{ block.label }}</span>
                        <span class="fin-doc-no fin-doc-no-inline">{{ block.no }}</span>
                      </div>
                      <div class="fin-doc-date">{{ block.date }}</div>
                    </div>
                  </td>
                  <td class="fin-col-party">
                    <div class="fw-semibold">{{ rowPartyName(item) || "—" }}</div>
                    <div
                      v-if="flowDirection === ''"
                      class="data-meta text-capitalize"
                    >
                      {{ item.flowDirection === "in" ? "In flow" : "Out flow" }}
                    </div>
                  </td>
                  <td class="fin-col-status">
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
                        Created by: {{ item.createdBy || "-" }}
                      </div>
                      <div>
                        Updated by: {{ item.updatedBy || "-" }}
                      </div>
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
                <td :colspan="TABLE_COL_COUNT" class="text-center text-muted py-3">
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
  table-layout: fixed;
  min-width: 1880px;

  th,
  td {
    padding-left: 0.65rem;
    padding-right: 0.65rem;
  }

  th {
    vertical-align: middle;
    font-size: 0.8rem;
  }

  td {
    overflow: hidden;
    vertical-align: top;
  }

  .fin-col-no {
    width: 50px;
  }

  .fin-desc {
    width: 220px;
    min-width: 180px;
  }

  .fin-site {
    width: 180px;
    min-width: 140px;
  }

  .fin-col-qty {
    width: 72px;
    min-width: 72px;
  }

  .fin-col-amount {
    width: 11.5rem;
    min-width: 11.5rem;
    padding-right: 1.1rem;
  }

  .fin-col-doc {
    width: 8.75rem;
    min-width: 8.75rem;
    padding-left: 0.85rem;
  }

  .fin-col-balap {
    width: 10.75rem;
    min-width: 10.75rem;
    padding-right: 0.85rem;
  }

  .fin-col-paid {
    width: 9.75rem;
    min-width: 9.75rem;
    padding-left: 0.85rem;
  }

  .fin-doc-cell {
    padding-top: 0.35rem;
    padding-bottom: 0.35rem;
  }

  .fin-col-party {
    width: 120px;
    min-width: 120px;
  }

  .fin-col-status {
    width: 140px;
    min-width: 140px;
  }

  .fin-doc-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
    min-width: 0;
    width: 100%;
  }

  .fin-doc-no {
    font-size: 0.82rem;
    font-weight: 600;
    color: #212529;
    line-height: 1.2;
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .fin-doc-no-inline {
    display: inline;
    font-size: inherit;
  }

  .fin-doc-date {
    font-size: 0.72rem;
    color: #6c757d;
    line-height: 1.15;
    white-space: nowrap;
  }

  .fin-amount-stack > div {
    line-height: 1.45;
    white-space: nowrap;
  }

  .fin-amount-stack .label-prefix {
    display: inline;
  }
}

.pf-filter-one-line {
  overflow-x: auto;
  scrollbar-width: thin;
}

.pf-filter-search {
  min-width: 7.5rem;
}

.pf-filter-status {
  width: 9.25rem;
  min-width: 9.25rem;
}

.pf-filter-flow {
  width: 9.25rem;
  min-width: 9.25rem;
}
</style>
