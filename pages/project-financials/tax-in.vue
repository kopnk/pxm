<script setup lang="ts">
import { computed } from "vue";
import { useProjectFinancialsListPage } from "@/composables/useProjectFinancialsListPage";
import { useProjectFinancialsTaxSectionExport } from "@/composables/useProjectFinancialsTaxSectionExport";
import {
  pfFormatIdDate,
  pfListLineBase,
  pfPartnerTaxRupiahForDisplay,
} from "@/composables/useProjectFinancialsDisplay";

const {
  store,
  search,
  status,
  statusOptions,
  prevPage,
  nextPage,
  formatCurrencyIdr,
  getRowNumber,
} = useProjectFinancialsListPage();

const { exporting, downloadExcel } =
  useProjectFinancialsTaxSectionExport("tax-in");

const onExportExcel = () => {
  void downloadExcel({
    search: search.value,
    status: status.value,
  });
};

const taxInRows = computed(() =>
  store.items.filter((item) => {
    if (item.flowDirection !== "in") return false;
    const taxInRate = Number(item.taxIn ?? 0);
    return Number.isFinite(taxInRate) && taxInRate > 0;
  }),
);

const sectionRowCount = computed(() => taxInRows.value.length);
const sectionShowingStart = computed(() =>
  sectionRowCount.value === 0 ? 0 : 1,
);
const sectionShowingEnd = computed(() => sectionRowCount.value);

const sectionTotalDpp = computed(() =>
  store.loading ? null : store.listTotals.taxInSection.dppIdr,
);
const sectionTotalTaxIn = computed(() =>
  store.loading ? null : store.listTotals.taxInSection.taxIdr,
);

const formatCity = (value: unknown) => {
  if (!value || typeof value !== "object") return "—";
  const city = (value as { city?: unknown }).city;
  if (typeof city !== "string" || city.trim() === "") return "—";
  return city;
};
</script>

<template>
  <div class="container-fluid py-4 px-3">
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">Tax In</h4>
    </div>

    <div class="card mb-3 border-0 shadow-sm">
      <div
        class="card-body d-flex flex-nowrap align-items-center gap-2 py-2 px-2 pf-tax-filter-one-line"
      >
        <input
          v-model="search"
          type="search"
          class="form-control form-control-sm pf-tax-filter-search"
          placeholder="PO, invoice, partner, project, site…"
        />
        <select
          v-model="status"
          class="form-select form-select-sm flex-shrink-0 pf-tax-filter-status"
        >
          <option
            v-for="option in statusOptions"
            :key="option.value === '' ? 'all' : option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <div
          class="d-flex align-items-center gap-3 flex-shrink-0 ms-auto pf-tax-filter-totals"
          role="group"
          aria-label="Filtered totals"
        >
          <span class="text-nowrap">
            <span class="label-prefix">Total Dpp</span>
            <span class="fw-semibold">{{ formatCurrencyIdr(sectionTotalDpp) }}</span>
          </span>
          <span class="text-nowrap">
            <span class="label-prefix">Total Tax In</span>
            <span class="fw-semibold">{{ formatCurrencyIdr(sectionTotalTaxIn) }}</span>
          </span>
        </div>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm text-nowrap flex-shrink-0"
          :disabled="exporting"
          aria-label="Download Excel for current search and status filters"
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
                <th class="text-center text-nowrap" style="width: 50px">No</th>
                <th>NPWP</th>
                <th>Name</th>
                <th>Address</th>
                <th>City</th>
                <th>DPP</th>
                <th>Tax In</th>
                <th>No Journal/Bill</th>
                <th>Paid Date</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="store.loading">
                <td colspan="10" class="text-center py-3">Loading…</td>
              </tr>

              <template v-else>
                <tr v-for="(item, idx) in taxInRows" :key="item.id">
                  <td class="text-center data-meta">
                    {{ getRowNumber(idx) }}
                  </td>
                  <td>{{ item.partnerNpwp || "—" }}</td>
                  <td>{{ item.partnerName || "—" }}</td>
                  <td>{{ item.partnerAddressText || "—" }}</td>
                  <td>{{ formatCity(item.partnerAddressMeta) }}</td>
                  <td>
                    {{
                      formatCurrencyIdr(
                        pfListLineBase(item.qtyPartner, item.unitPricePartner),
                      )
                    }}
                  </td>
                  <td>
                    {{
                      formatCurrencyIdr(
                        pfPartnerTaxRupiahForDisplay(
                          item.qtyPartner,
                          item.unitPricePartner,
                          item.taxIn,
                        ),
                      )
                    }}
                  </td>
                  <td>{{ item.docNumber || item.invoiceNumberPartner || "—" }}</td>
                  <td>{{ pfFormatIdDate(item.docDate || item.invoiceDatePartner) }}</td>
                  <td style="min-width: 320px">
                    <div>{{ item.projectName || "—" }} {{ item.projectPoNumber || "—" }}</div>
                    <div class="data-meta">
                      {{ item.detailMaterialName || "—" }} {{ item.detailSiteName || "—" }}
                    </div>
                    <div class="data-meta">
                      {{ item.detailSiteId || "—" }} {{ item.detailSystemkey || "—" }}
                    </div>
                  </td>
                </tr>
              </template>

              <tr v-if="!store.loading && taxInRows.length === 0">
                <td colspan="10" class="text-center text-muted py-3">
                  No data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div
      v-if="
        !store.loading &&
        (sectionRowCount > 0 || store.totalPages > 1)
      "
      class="d-flex justify-content-between align-items-center mt-3"
    >
      <div v-if="sectionRowCount > 0" class="data-meta">
        Showing
        {{ sectionShowingStart }}
        –
        {{ sectionShowingEnd }}
        of {{ sectionRowCount }} entries
      </div>
      <div
        v-else-if="store.totalPages > 1"
        class="data-meta"
      >
        No matching entries on this page
      </div>
      <AppPagination
        :current-page="store.page"
        :total-pages="store.totalPages"
        @prev="prevPage"
        @next="nextPage"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.pf-tax-filter-one-line {
  overflow-x: auto;
  scrollbar-width: thin;
}

.pf-tax-filter-search {
  min-width: 0;
  flex: 1 1 24rem;
  max-width: 48rem;
}

.pf-tax-filter-status {
  width: 10.5rem;
  min-width: 10.5rem;
}

.pf-tax-filter-totals {
  white-space: nowrap;
}

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
    line-height: 1.35;
  }

  .fin-stack .text-muted {
    display: inline-block;
    min-width: 3.25rem;
    margin-right: 0.15rem;
  }
}
</style>
