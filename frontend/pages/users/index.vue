<script setup lang="ts">
import { useUsersListPage } from "@/composables/useUsersListPage";
import { formatListTimestamp } from "@/utils/formatListTimestamp";

definePageMeta({});

const {
  store,
  canCreate,
  canEdit,
  canEditUser,
  canDeleteUser,
  expandedRow,
  deletingId,
  resettingId,
  showDeleteModal,
  showResetModal,
  deleteTargetUser,
  resetTargetUser,
  searchFilter,
  roleFilter,
  isActiveFilter,
  showingStart,
  showingEnd,
  openDeleteModal,
  cancelDelete,
  performDelete,
  openResetModal,
  cancelReset,
  performReset,
  nextPage,
  prevPage,
  toggleRow,
  getRowNumber,
} = useUsersListPage();
</script>

<template>
  <div class="container-fluid py-4 px-3">
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0" data-page-focus>Users</h4>

      <NuxtLink v-if="canCreate" to="/users/signup" class="btn btn-primary">
        + New user
      </NuxtLink>
    </div>

    <div class="card mb-3 border-0 shadow-sm">
      <div
        class="card-body d-flex flex-nowrap align-items-center gap-2 py-2 px-2 users-filter-one-line"
      >
        <input
          v-model="searchFilter"
          type="search"
          class="form-control form-control-sm users-filter-search"
          placeholder="Email, name, phone, region..."
        />
        <select
          v-model="roleFilter"
          class="form-select form-select-sm flex-shrink-0 users-filter-role"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>
        <select
          v-model="isActiveFilter"
          class="form-select form-select-sm flex-shrink-0 users-filter-status"
        >
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
    </div>

    <div class="card shadow-sm border-0">
      <div class="card-body p-0">
        <div class="table-wrapper">
          <table class="table table-striped table-users mb-0">
            <thead class="table-light">
              <tr>
                <th class="text-center" width="64">No</th>
                <th>Email</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Region</th>
                <th>Area</th>
                <th>Role</th>
                <th>Reset password</th>
                <th>Last login</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="store.loading">
                <td colspan="10" class="text-center py-3">Loading...</td>
              </tr>

              <template v-for="(item, index) in store.items" :key="item.id">
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
                      v-if="canEditUser(item.role)"
                      :to="`/users/update?id=${item.id}`"
                      class="text-primary fw-semibold text-decoration-none"
                    >
                      {{ item.email }}
                    </NuxtLink>
                    <span v-else class="fw-semibold">{{ item.email }}</span>
                  </td>

                  <td>{{ item.firstName }} {{ item.lastName }}</td>
                  <td>{{ item.phone || "-" }}</td>
                  <td>{{ item.region || "-" }}</td>
                  <td>{{ item.area || "-" }}</td>
                  <td class="text-uppercase">{{ item.role }}</td>

                  <td>
                    <button
                      v-if="canEditUser(item.role)"
                      type="button"
                      class="btn btn-outline-warning btn-sm"
                      :disabled="resettingId === item.id"
                      @click="openResetModal(item.id)"
                    >
                      {{ resettingId === item.id ? "..." : "Reset" }}
                    </button>
                    <span v-else class="data-meta">-</span>
                  </td>

                  <td class="data-meta text-nowrap">
                    {{ formatListTimestamp(item.lastLoginAt) }}
                  </td>

                  <td>
                    <div>
                      <span
                        class="badge me-2"
                        :class="item.isActive ? 'bg-success' : 'bg-secondary'"
                      >
                        {{ item.isActive ? "Active" : "Inactive" }}
                      </span>
                    </div>
                    <div
                      v-if="item.mustChangePassword"
                      class="data-meta mt-1"
                    >
                      Must change password
                    </div>
                    <AppAuditMeta
                      :created-by="item.createdBy"
                      :updated-by="item.updatedBy"
                      :created-at="item.createdAt"
                      :updated-at="item.updatedAt"
                    />
                    <span
                      v-if="canDeleteUser(item.role)"
                      class="text-danger fw-semibold d-block mt-1"
                      style="cursor: pointer"
                      @click.stop="openDeleteModal(item.id)"
                    >
                      <span v-if="deletingId === item.id">...</span>
                      <span v-else>x</span>
                    </span>
                  </td>
                </tr>

                <tr v-if="expandedRow === item.id" class="bg-light">
                  <td colspan="10">
                    <div class="p-4">
                      <div class="mb-0">
                        <div class="data-label">Avatar URL</div>
                        <div class="data-value">{{ item.avatarUrl || "-" }}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>

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

    <div class="d-flex justify-content-between align-items-center mt-3">
      <div class="data-meta">
        Showing
        {{ showingStart }}
        -
        {{ showingEnd }}
        of {{ store.meta.total }} entries
      </div>

      <AppPagination
        :current-page="store.meta.page"
        :total-pages="store.meta.totalPages"
        @prev="prevPage"
        @next="nextPage"
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
        <span class="fw-bold">{{ deleteTargetUser?.email || "this user" }}</span
        >?
      </p>
    </AppConfirmDialog>

    <AppConfirmDialog
      :visible="showResetModal"
      title="Reset password"
      :loading="!!resettingId"
      confirm-label="Reset password"
      confirm-variant="warning"
      focus-target="confirm"
      @cancel="cancelReset"
      @confirm="performReset"
    >
      <p class="mb-2">
        Reset password for
        <span class="fw-bold">{{ resetTargetUser?.email || "this user" }}</span
        >?
      </p>
      <p class="data-meta mb-0">
        The temporary password is configured on the server. After reset, the
        user must change it on first login.
      </p>
    </AppConfirmDialog>
  </div>
</template>

<style scoped lang="scss">
.users-filter-one-line {
  overflow-x: auto;
  scrollbar-width: thin;
}

.users-filter-search {
  min-width: 0;
  flex: 1 1 24rem;
  max-width: 48rem;
}

.users-filter-role,
.users-filter-status {
  width: 10.5rem;
  min-width: 10.5rem;
}

.table-users {
  th,
  td {
    font-size: 0.9rem;
  }
}
</style>
