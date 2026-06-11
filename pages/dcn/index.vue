<script setup lang="ts">
import { useDcnListPage } from "@/composables/useDcnListPage";
import { formatListTimestamp } from "@/utils/formatListTimestamp";

const {
  store,
  searchFilter,
  flowFilter,
  typeFilter,
  deletingId,
  canCreate,
  canEdit,
  canDelete,
  changePage,
  remove,
  flowBadgeClass,
  typeLabelByCode,
  showingStart,
  showingEnd,
  DCN_OUT_TYPE_OPTIONS,
} = useDcnListPage();

const displayType = (value: string | null | undefined) => {
  if (!value) return "—";
  return typeLabelByCode[value] ?? value;
};
</script>

<template>
  <div class="container-fluid py-4 px-3">
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">DCN</h4>
      <NuxtLink v-if="canCreate" to="/dcn/create" class="btn btn-primary">
        + New DCN
      </NuxtLink>
    </div>

    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2">
        <div class="col-md-4">
          <input
            v-model="searchFilter"
            type="search"
            class="form-control"
            placeholder="Search"
          />
        </div>

        <div class="col-md-3">
          <select v-model="flowFilter" class="form-select">
            <option value="">All Flow</option>
            <option value="in">In</option>
            <option value="out">Out</option>
          </select>
        </div>

        <div class="col-md-3">
          <select
            v-model="typeFilter"
            class="form-select"
            :disabled="flowFilter !== 'out'"
          >
            <option value="">All Type</option>
            <option
              v-for="option in DCN_OUT_TYPE_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.value }} - {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="card shadow-sm border-0">
      <div class="card-body p-0">
        <div class="table-wrapper">
          <table class="table table-striped table-users mb-0">
            <thead class="table-light">
              <tr>
                <th width="50">No</th>
                <th>Date</th>
                <th>Number</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Subject</th>
                <th>Flow</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="store.loading">
                <td colspan="9" class="text-center py-3">Loading...</td>
              </tr>

              <tr v-for="(item, index) in store.items" :key="item.id">
                <td class="text-center data-meta">
                  {{ (store.page - 1) * store.limit + index + 1 }}
                </td>
                <td>{{ item.letterDate || "—" }}</td>
                <td>
                  <NuxtLink
                    v-if="canEdit"
                    :to="`/dcn/update?id=${item.id}`"
                    class="fw-semibold text-primary text-decoration-none"
                  >
                    {{ item.number || "—" }}
                  </NuxtLink>
                  <span v-else class="fw-semibold">{{ item.number || "—" }}</span>
                </td>
                <td>{{ displayType(item.type) }}</td>
                <td>{{ item.fromAddress || "—" }}</td>
                <td>{{ item.toAddress || "—" }}</td>
                <td>{{ item.subject || "—" }}</td>
                <td>
                  <span class="badge" :class="flowBadgeClass(item.flow)">
                    {{ item.flow === "out" ? "Out" : "In" }}
                  </span>
                </td>
                <td>
                  <div class="data-meta">Created by: {{ item.createdBy || "-" }}</div>
                  <div class="data-meta">Updated by: {{ item.updatedBy || "-" }}</div>
                  <div class="data-meta">Created: {{ formatListTimestamp(item.createdAt) }}</div>
                  <div class="data-meta">Updated: {{ formatListTimestamp(item.updatedAt) }}</div>
                  <div v-if="canDelete" class="mt-1">
                    <span
                      class="text-danger small fw-semibold"
                      style="cursor: pointer"
                      @click.stop="remove(item.id, item.number, item.letterDate)"
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

    <div
      v-if="store.total !== undefined"
      class="d-flex justify-content-between align-items-center mt-3"
    >
      <div class="data-meta">
        Showing {{ showingStart }} - {{ showingEnd }} of
        {{ store.total }} entries
      </div>

      <AppPagination
        :current-page="store.page"
        :total-pages="store.totalPages"
        @prev="changePage(store.page - 1)"
        @next="changePage(store.page + 1)"
      />
    </div>
  </div>
</template>
