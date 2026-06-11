<script setup lang="ts">
definePageMeta({});

import { formatListTimestamp } from "@/utils/formatListTimestamp";
import { useAuditListPage } from "@/composables/useAuditListPage";

const {
  store,
  searchFilter,
  actionFilter,
  targetTableFilter,
  selectedIds,
  deleting,
  AUDIT_ACTION_OPTIONS,
  changePage,
  isSelected,
  allVisibleSelected,
  toggleRow,
  toggleSelectAllVisible,
  formatMetadata,
  metadataTitle,
  displayUser,
  actionBadgeClass,
  deleteSelected,
} = useAuditListPage();
</script>

<template>
  <div class="container-fluid py-4 px-3">
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">Audit Log</h4>

      <button
        type="button"
        class="btn btn-danger btn-sm"
        :disabled="!selectedIds.length || deleting"
        @click="deleteSelected"
      >
        {{ deleting ? "Deleting..." : `Delete selected (${selectedIds.length})` }}
      </button>
    </div>

    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2">
        <div class="col-md-4">
          <input
            v-model="searchFilter"
            class="form-control"
            placeholder="Search user, action, description..."
          />
        </div>

        <div class="col-md-3">
          <select v-model="actionFilter" class="form-select">
            <option value="">All Actions</option>
            <option
              v-for="option in AUDIT_ACTION_OPTIONS"
              :key="option"
              :value="option"
            >
              {{ option }}
            </option>
          </select>
        </div>

        <div class="col-md-3">
          <input
            v-model="targetTableFilter"
            class="form-control"
            placeholder="Target table (e.g. projects)"
          />
        </div>
      </div>
    </div>

    <div class="card shadow-sm border-0">
      <div class="card-body p-0">
        <div class="table-wrapper">
          <table class="table table-striped table-users mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 42px" class="text-center">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    :checked="allVisibleSelected"
                    :disabled="!store.items.length"
                    aria-label="Select all visible audit logs"
                    @change="toggleSelectAllVisible"
                  />
                </th>
                <th style="width: 50px">No</th>
                <th>Date Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Access Via</th>
                <th>Description</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="store.loading">
                <td colspan="8" class="text-center py-3">Loading...</td>
              </tr>

              <tr v-for="(item, index) in store.items" :key="item.id">
                <td class="text-center">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    :checked="isSelected(item.id)"
                    :aria-label="`Select audit log ${item.id}`"
                    @change="toggleRow(item.id)"
                  />
                </td>

                <td class="text-center data-meta">
                  {{ (store.page - 1) * store.limit + index + 1 }}
                </td>

                <td>{{ formatListTimestamp(item.createdAt) }}</td>

                <td>
                  <div class="fw-semibold" style="font-size: 0.95rem">
                    {{ displayUser(item) }}
                  </div>
                  <div v-if="item.user" class="data-meta">
                    <span class="label-prefix">EMAIL</span>{{ item.user.email }}
                  </div>
                  <div v-if="item.user?.role" class="data-meta">
                    <span class="label-prefix">ROLE</span>{{ item.user.role }}
                  </div>
                </td>

                <td>
                  <span class="badge" :class="actionBadgeClass(item.action)">
                    {{ item.action }}
                  </span>
                </td>

                <td>
                  <div class="fw-semibold" style="font-size: 0.95rem">
                    {{ item.access.deviceType }}
                  </div>
                  <div class="data-meta">
                    <span class="label-prefix">OS</span>{{ item.access.os }}
                  </div>
                  <div class="data-meta">
                    <span class="label-prefix">BROWSER</span>{{ item.access.browser }}
                  </div>
                  <div class="data-meta">
                    <span class="label-prefix">IP</span>{{ item.access.ip }}
                  </div>
                </td>

                <td>{{ item.description }}</td>

                <td>
                  <span
                    class="data-meta d-inline-block text-truncate"
                    style="max-width: 260px"
                    :title="metadataTitle(item.metadata)"
                  >
                    {{ formatMetadata(item.metadata) }}
                  </span>
                </td>
              </tr>

              <tr v-if="!store.loading && store.items.length === 0">
                <td colspan="8" class="text-center text-muted py-3">
                  No audit logs found
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
        Showing
        {{ store.total === 0 ? 0 : (store.page - 1) * store.limit + 1 }}
        -
        {{ Math.min(store.page * store.limit, store.total) }}
        of {{ store.total }} entries
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
