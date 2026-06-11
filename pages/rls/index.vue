<script setup lang="ts">
definePageMeta({
  middleware: ["superadmin"],
});

import { RLS_ACTIONS } from "~/lib/rls";
import {
  RLS_ACTION_LABELS,
  useRlsListPage,
} from "@/composables/useRlsListPage";

const {
  store,
  searchFilter,
  roleFilter,
  isActiveFilter,
  menuSearchFilter,
  actionFilter,
  filteredUsers,
  visibleMenus,
  tableRows,
  hasActiveFilters,
  canEditUserRls,
  isChecked,
  onToggle,
} = useRlsListPage();
</script>

<template>
  <div class="container-fluid py-4 px-3">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h4 mb-0">RLS — Role Access Matrix</h1>
      <span v-if="!store.loading" class="data-meta">
        {{ filteredUsers.length }} user{{ filteredUsers.length === 1 ? "" : "s" }}
        · {{ visibleMenus.length }} menu{{ visibleMenus.length === 1 ? "" : "s" }}
      </span>
    </div>

    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2 align-items-end">
        <div class="col-lg-3 col-md-6">
          <label class="label-field d-block mb-1">Search user</label>
          <input
            v-model="searchFilter"
            class="form-control"
            placeholder="Email, name, role..."
          />
        </div>

        <div class="col-lg-2 col-md-3 col-6">
          <label class="label-field d-block mb-1">Role</label>
          <select v-model="roleFilter" class="form-select">
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        <div class="col-lg-2 col-md-3 col-6">
          <label class="label-field d-block mb-1">Status</label>
          <select v-model="isActiveFilter" class="form-select">
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div class="col-lg-2 col-md-4 col-6">
          <label class="label-field d-block mb-1">Action</label>
          <select v-model="actionFilter" class="form-select">
            <option value="">All actions</option>
            <option
              v-for="action in RLS_ACTIONS"
              :key="action"
              :value="action"
            >
              {{ RLS_ACTION_LABELS[action] }}
            </option>
          </select>
        </div>

        <div class="col-lg-3 col-md-8">
          <label class="label-field d-block mb-1">Search menu</label>
          <input
            v-model="menuSearchFilter"
            class="form-control"
            placeholder="Projects, Tax In, Clients..."
          />
        </div>
      </div>
    </div>

    <div v-if="store.loading" class="text-center py-5 data-meta">Loading…</div>

    <div v-else class="table-responsive rls-table-wrap">
      <table class="table table-bordered table-sm align-middle rls-table mb-0">
        <thead>
          <tr>
            <th class="rls-sticky-col rls-user-col">User</th>
            <th class="rls-action-col">Action</th>
            <th
              v-for="menu in visibleMenus"
              :key="menu.key"
              class="text-center"
            >
              {{ menu.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in tableRows"
            :key="`${row.userId}-${row.action}`"
            :class="{
              'rls-row-saving': store.savingUserId === row.userId,
              'rls-user-even': row.userIndex % 2 === 1,
            }"
          >
            <td
              v-if="row.showUser"
              :rowspan="row.rowSpan"
              class="rls-sticky-col rls-user-col"
            >
              <div class="fw-semibold" style="font-size: 0.95rem">
                {{ row.email }}
              </div>
              <div
                v-if="row.firstName || row.lastName"
                class="data-value"
              >
                {{ [row.firstName, row.lastName].filter(Boolean).join(" ") }}
              </div>
              <div class="data-meta text-uppercase">{{ row.role }}</div>
            </td>
            <td class="rls-action-col data-meta">
              {{ RLS_ACTION_LABELS[row.action] }}
            </td>
            <td
              v-for="menu in visibleMenus"
              :key="`${row.userId}-${row.action}-${menu.key}`"
              class="text-center"
            >
              <input
                type="checkbox"
                class="form-check-input"
                :checked="isChecked(row.userId, menu.key, row.action)"
                :disabled="!canEditUserRls(row.role)"
                :aria-label="`${row.email} ${row.action} ${menu.label}`"
                @change="onToggle(row.userId, menu.key, row.action, $event)"
              />
            </td>
          </tr>
          <tr v-if="!tableRows.length">
            <td
              :colspan="2 + visibleMenus.length"
              class="text-center data-meta py-4"
            >
              {{
                store.users.length && hasActiveFilters
                  ? "No users match the current filters."
                  : "No users found."
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.rls-table-wrap {
  max-height: calc(100vh - 17rem);
  overflow: auto;
}

.rls-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8f9fa;
  white-space: nowrap;
}

.rls-sticky-col {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fff;
}

.rls-table tbody tr.rls-user-even td {
  background-color: #f2f4f6;
}

.rls-table tbody tr.rls-user-even .rls-sticky-col {
  background-color: #f2f4f6;
}

.rls-user-col {
  min-width: 14rem;
}

.rls-action-col {
  min-width: 5.5rem;
  white-space: nowrap;
}

.rls-table thead .rls-sticky-col {
  z-index: 3;
  background: #f8f9fa;
}

.rls-row-saving {
  opacity: 0.65;
}
</style>
