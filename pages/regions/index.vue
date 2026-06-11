<script setup lang="ts">
import { formatListTimestamp } from "@/utils/formatListTimestamp";
import { useRegionsListPage } from "@/composables/useRegionsListPage";

const {
  store,
  searchFilter,
  typeFilter,
  deletingId,
  canCreate,
  canEdit,
  canDelete,
  changePage,
  remove,
  typeLabel,
  showingStart,
  showingEnd,
} = useRegionsListPage();
</script>

<template>
  <div class="container-fluid py-4 px-3">
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">Regions</h4>

      <NuxtLink v-if="canCreate" to="/regions/create" class="btn btn-primary">
        + New Region
      </NuxtLink>
    </div>

    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2">
        <div class="col-md-5">
          <input
            v-model="searchFilter"
            type="search"
            class="form-control"
            placeholder="Search name…"
          />
        </div>
        <div class="col-md-3">
          <select v-model="typeFilter" class="form-select">
            <option value="">All types</option>
            <option value="region">Region</option>
            <option value="sub_region">Sub Region</option>
            <option value="city_kab">City / Kab</option>
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
                <th>Name</th>
                <th>Type</th>
                <th>Parent</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="store.loading">
                <td colspan="5" class="text-center py-3">Loading...</td>
              </tr>

              <tr v-for="(item, index) in store.items" :key="item.id">
                <td class="text-center fw-bold">
                  {{ (store.page - 1) * store.limit + index + 1 }}
                </td>

                <td>
                  <NuxtLink
                    v-if="canEdit"
                    :to="`/regions/update?id=${item.id}`"
                    class="text-primary fw-semibold text-decoration-none"
                  >
                    {{ item.name }}
                  </NuxtLink>
                  <span v-else>{{ item.name }}</span>
                </td>

                <td>{{ typeLabel(item.type) }}</td>
                <td>{{ item.parentName || "—" }}</td>

                <td>
                  <div class="data-meta mt-1">
                    <div>Created by: {{ item.createdBy || "-" }}</div>
                    <div>Updated by: {{ item.updatedBy || "-" }}</div>
                    <div>Created: {{ formatListTimestamp(item.createdAt) }}</div>
                    <div>Updated: {{ formatListTimestamp(item.updatedAt) }}</div>
                  </div>
                  <span
                    v-if="canDelete"
                    class="text-danger fw-semibold d-block mt-1"
                    style="cursor: pointer"
                    @click.stop="remove(item.id, item.name)"
                  >
                    <span v-if="deletingId === item.id">...</span>
                    <span v-else>×</span>
                  </span>
                </td>
              </tr>

              <tr v-if="!store.loading && store.items.length === 0">
                <td colspan="5" class="text-center text-muted py-3">
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
