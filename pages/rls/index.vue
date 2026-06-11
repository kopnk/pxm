<script setup lang="ts">
definePageMeta({
  middleware: ["superadmin"],
});

import {
  RLS_ACTIONS_ORDER,
  RLS_ACTION_LABELS,
  useRlsListPage,
} from "@/composables/useRlsListPage";

const {
  store,
  expandedRow,
  searchFilter,
  roleFilter,
  isActiveFilter,
  menuSearchFilter,
  filteredUsers,
  visibleMenus,
  hasActiveFilters,
  canEditUserRls,
  toggleRow,
  getRowNumber,
  getUserFullName,
  isChecked,
  onToggle,
} = useRlsListPage();
</script>

<template>
  <div class="container-fluid py-4 px-3">
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">Role Access</h4>
      <span v-if="!store.loading" class="data-meta">
        {{ filteredUsers.length }} user{{ filteredUsers.length === 1 ? "" : "s" }}
      </span>
    </div>

    <div class="card mb-3 border-0 shadow-sm">
      <div
        class="card-body d-flex flex-nowrap align-items-center gap-2 py-2 px-2 rls-filter-one-line"
      >
        <input
          v-model="searchFilter"
          type="search"
          class="form-control form-control-sm rls-filter-search"
          placeholder="Email, name, role…"
        />
        <select
          v-model="roleFilter"
          class="form-select form-select-sm flex-shrink-0 rls-filter-select"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>
        <select
          v-model="isActiveFilter"
          class="form-select form-select-sm flex-shrink-0 rls-filter-select"
        >
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <input
          v-model="menuSearchFilter"
          type="search"
          class="form-control form-control-sm flex-shrink-0 rls-filter-menu"
          placeholder="Filter menu in panel…"
        />
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
                <th>Role</th>
                <th>Status</th>
                <th>Permissions</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="store.loading">
                <td colspan="6" class="text-center py-3">Loading...</td>
              </tr>

              <template v-for="(user, index) in filteredUsers" :key="user.id">
                <tr
                  :class="{
                    'rls-row-saving': store.savingUserId === user.id,
                  }"
                >
                  <td
                    class="text-center text-muted fw-semibold"
                    style="cursor: pointer"
                    :title="expandedRow === user.id ? 'Collapse' : 'Expand permissions'"
                    @click="toggleRow(user.id)"
                  >
                    {{ getRowNumber(index) }}
                  </td>

                  <td>
                    <span class="fw-semibold">{{ user.email }}</span>
                  </td>

                  <td>{{ getUserFullName(user.firstName, user.lastName) }}</td>

                  <td class="text-uppercase">{{ user.role }}</td>

                  <td>
                    <span
                      class="badge"
                      :class="user.isActive ? 'bg-success' : 'bg-secondary'"
                    >
                      {{ user.isActive ? "Active" : "Inactive" }}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      class="btn btn-outline-primary btn-sm"
                      @click="toggleRow(user.id)"
                    >
                      {{
                        expandedRow === user.id
                          ? "Hide permissions"
                          : "Edit permissions"
                      }}
                    </button>
                    <div class="data-meta mt-1">
                      {{ visibleMenus.length }} menu{{
                        visibleMenus.length === 1 ? "" : "s"
                      }}
                    </div>
                  </td>
                </tr>

                <tr
                  v-if="expandedRow === user.id"
                  class="bg-light"
                >
                  <td colspan="6" class="p-0">
                    <div
                      class="p-3"
                      :class="{
                        'rls-panel-saving': store.savingUserId === user.id,
                      }"
                    >
                      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                        <div>
                          <div class="data-label">Permissions for</div>
                          <div class="data-value">{{ user.email }}</div>
                        </div>
                        <span class="data-meta">
                          Click checkboxes to save immediately
                        </span>
                      </div>

                      <div class="table-scroll-x">
                        <table class="table table-sm table-bordered table-users mb-0 rls-perm-table">
                          <thead class="table-light">
                            <tr>
                              <th style="min-width: 10rem">Menu</th>
                              <th
                                v-for="action in RLS_ACTIONS_ORDER"
                                :key="action"
                                class="text-center"
                                style="min-width: 5rem"
                              >
                                {{ RLS_ACTION_LABELS[action] }}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="menu in visibleMenus"
                              :key="menu.key"
                            >
                              <td>
                                <div class="fw-semibold">{{ menu.label }}</div>
                                <div class="data-meta">{{ menu.key }}</div>
                              </td>
                              <td
                                v-for="action in RLS_ACTIONS_ORDER"
                                :key="`${menu.key}-${action}`"
                                class="text-center align-middle"
                              >
                                <input
                                  type="checkbox"
                                  class="form-check-input"
                                  :checked="isChecked(user.id, menu.key, action)"
                                  :disabled="!canEditUserRls(user.role)"
                                  :aria-label="`${user.email} ${menu.label} ${action}`"
                                  @change="
                                    onToggle(user.id, menu.key, action, $event)
                                  "
                                />
                              </td>
                            </tr>
                            <tr v-if="!visibleMenus.length">
                              <td
                                :colspan="1 + RLS_ACTIONS_ORDER.length"
                                class="text-center data-meta py-3"
                              >
                                No menus match the current filter.
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>

              <tr v-if="!store.loading && !filteredUsers.length">
                <td colspan="6" class="text-center text-muted py-3">
                  {{
                    store.users.length && hasActiveFilters
                      ? "No users match the current filters."
                      : "No data available"
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rls-filter-one-line {
  overflow-x: auto;
  scrollbar-width: thin;
}

.rls-filter-search {
  min-width: 0;
  flex: 1 1 20rem;
  max-width: 36rem;
}

.rls-filter-select {
  width: 10.5rem;
  min-width: 10.5rem;
}

.rls-filter-menu {
  width: 14rem;
  min-width: 14rem;
}

.table-scroll-x {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.rls-perm-table {
  min-width: 36rem;
}

.rls-row-saving,
.rls-panel-saving {
  opacity: 0.65;
}
</style>
