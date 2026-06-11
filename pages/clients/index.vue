<script setup lang="ts">
import { formatListTimestamp } from "@/utils/formatListTimestamp";
import { useClientsListPage } from "@/composables/useClientsListPage";

const {
  store,
  searchFilter,
  isActiveFilter,
  deletingId,
  canCreate,
  canEdit,
  canDelete,
  changePage,
  remove,
  showingStart,
  showingEnd,
} = useClientsListPage();
</script>

<template>
  <div class="container-fluid py-4 px-3">
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">Clients</h4>

      <NuxtLink v-if="canCreate" to="/clients/create" class="btn btn-primary">
        + New Client
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
          <select v-model="isActiveFilter" class="form-select">
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
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
                <th>NPWP</th>
                <th>Bank</th>
                <th>Contact</th>
                <th>Address</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="store.loading">
                <td colspan="7" class="text-center py-3">Loading...</td>
              </tr>

              <tr v-for="(c, index) in store.items" :key="c.id">
                <td class="text-center fw-bold">
                  {{ (store.page - 1) * store.limit + index + 1 }}
                </td>

                <td>
                  <NuxtLink
                    v-if="canEdit"
                    :to="`/clients/update?id=${c.id}`"
                    class="text-primary fw-semibold text-decoration-none"
                  >
                    {{ c.name }}
                  </NuxtLink>
                  <span v-else>{{ c.name }}</span>
                  <div class="data-meta mt-1">{{ c.contactEmail || "—" }}</div>
                </td>

                <td>{{ c.npwp }}</td>
                <td>
                  <div class="fw-semibold">{{ c.bankName || "—" }}</div>
                  <div class="data-meta">{{ c.bankAccount || "—" }}</div>
                </td>
                <td>
                  <div class="fw-semibold">{{ c.contactName || "—" }}</div>
                  <div class="data-meta">{{ c.contactPhone || "—" }}</div>
                </td>
                <td>
                  {{ c.addressText || "—" }}
                  <div v-if="c.addressMeta">
                    <div class="data-meta mt-1">
                      {{ c.addressMeta.city }},
                      {{ c.addressMeta.province }}
                    </div>
                  </div>
                </td>

                <td>
                  <div>
                    <span
                      class="badge me-2"
                      :class="c.isActive ? 'bg-success' : 'bg-danger'"
                    >
                      {{ c.isActive ? "Active" : "Inactive" }}
                    </span>
                  </div>
                  <div class="data-meta mt-1">
                    <div>Created by: {{ c.createdBy || "-" }}</div>
                    <div>Updated by: {{ c.updatedBy || "-" }}</div>
                    <div>Created: {{ formatListTimestamp(c.createdAt) }}</div>
                    <div>Updated: {{ formatListTimestamp(c.updatedAt) }}</div>
                  </div>
                  <span
                    v-if="canDelete"
                    class="text-danger fw-semibold"
                    style="cursor: pointer"
                    @click.stop="remove(c.id, c.name)"
                  >
                    <span v-if="deletingId === c.id">...</span>
                    <span v-else>×</span>
                  </span>
                </td>
              </tr>

              <tr v-if="!store.loading && store.items.length === 0">
                <td colspan="7" class="text-center text-muted py-3">
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
