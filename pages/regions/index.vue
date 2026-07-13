<script setup lang="ts">
import { useRegionsListPage } from "@/composables/useRegionsListPage";

const {
  store,
  searchFilter,
  regionFilter,
  subRegionFilter,
  regionOptions,
  subRegionOptions,
  filtersLoading,
  deletingId,
  showDeleteModal,
  deleteTargetRegion,
  canCreate,
  canEdit,
  canDelete,
  changePage,
  openDeleteModal,
  cancelDelete,
  performDelete,
  typeLabel,
  hierarchyLabel,
  showingStart,
  showingEnd,
} = useRegionsListPage();
</script>

<template>
  <div class="container-fluid py-4 px-3">
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0" data-page-focus>Regions</h4>

      <NuxtLink v-if="canCreate" to="/regions/create" class="btn btn-primary">
        + New Region
      </NuxtLink>
    </div>

    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2">
        <div class="col-lg-4 col-md-6">
          <input
            v-model="searchFilter"
            type="search"
            class="form-control"
            placeholder="Search region, sub region, city..."
          />
        </div>
        <div class="col-lg-4 col-md-6">
          <select
            v-model="regionFilter"
            class="form-select"
            :disabled="filtersLoading"
          >
            <option value="">All regions</option>
            <option
              v-for="region in regionOptions"
              :key="region.id"
              :value="region.id"
            >
              {{ region.name }}
            </option>
          </select>
        </div>
        <div class="col-lg-4 col-md-6">
          <select
            v-model="subRegionFilter"
            class="form-select"
            :disabled="filtersLoading"
          >
            <option value="">All sub regions</option>
            <option
              v-for="subRegion in subRegionOptions"
              :key="subRegion.id"
              :value="subRegion.id"
            >
              {{ subRegion.name }}
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
                <td>{{ hierarchyLabel(item) }}</td>

                <td>
                  <AppAuditMeta
                    :created-by="item.createdBy"
                    :updated-by="item.updatedBy"
                    :created-at="item.createdAt"
                    :updated-at="item.updatedAt"
                  />
                  <span
                    v-if="canDelete"
                    class="text-danger fw-semibold d-block mt-1"
                    style="cursor: pointer"
                    @click.stop="openDeleteModal(item.id)"
                  >
                    <span v-if="deletingId === item.id">...</span>
                    <span v-else>x</span>
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

    <AppConfirmDialog
      :visible="showDeleteModal"
      title="Confirm delete"
      :loading="!!deletingId"
      confirm-label="Delete"
      confirm-variant="danger"
      focus-target="cancel"
      @cancel="cancelDelete"
      @confirm="performDelete"
    >
      <p class="mb-0">
        Delete
        <span class="fw-bold">{{
          deleteTargetRegion?.name || "this region"
        }}</span
        >?
      </p>
    </AppConfirmDialog>
  </div>
</template>

