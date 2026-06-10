<script setup lang="ts">
definePageMeta({});

import { computed, onMounted, ref, watch } from "vue";
import {
  useAuditApi,
  AUDIT_ACTION_OPTIONS,
} from "@/composables/useAuditApi";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import { useFormHandler } from "@/composables/useFormHandler";
import { formatListTimestamp } from "@/utils/formatListTimestamp";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";

const { store, getAuditLogs, bulkDeleteAuditLogs } = useAuditApi();
const { handle } = useFormHandler();

const search = ref("");
const action = ref("");
const targetTable = ref("");
const selectedIds = ref<string[]>([]);
const deleting = ref(false);

const loadData = async (page = 1) => {
  await getAuditLogs({
    page,
    limit: store.limit ?? DEFAULT_PAGE_LIMIT,
    search: search.value || undefined,
    action: action.value || undefined,
    targetTable: targetTable.value || undefined,
  });
};

onMounted(() => {
  void loadData();
});

let timeout: ReturnType<typeof setTimeout> | null = null;
watch(search, () => {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    void loadData(1);
  }, 300);
});

watch([action, targetTable], () => {
  void loadData(1);
});

const changePage = (page: number) => {
  if (page < 1 || page > store.totalPages) return;
  void loadData(page);
};

const visibleIds = computed(() => store.items.map((item) => item.id));

const isSelected = (id: string) => selectedIds.value.includes(id);

const allVisibleSelected = computed(
  () =>
    visibleIds.value.length > 0 &&
    visibleIds.value.every((id) => selectedIds.value.includes(id)),
);

const toggleRow = (id: string) => {
  if (isSelected(id)) {
    selectedIds.value = selectedIds.value.filter((itemId) => itemId !== id);
    return;
  }

  selectedIds.value = [...selectedIds.value, id];
};

const toggleSelectAllVisible = () => {
  if (allVisibleSelected.value) {
    selectedIds.value = selectedIds.value.filter(
      (id) => !visibleIds.value.includes(id),
    );
    return;
  }

  selectedIds.value = [...new Set([...selectedIds.value, ...visibleIds.value])];
};

const formatMetadata = (metadata: Record<string, unknown>) => {
  if (!metadata || Object.keys(metadata).length === 0) return "—";

  try {
    const text = JSON.stringify(metadata, null, 0);
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  } catch {
    return "—";
  }
};

const metadataTitle = (metadata: Record<string, unknown>) => {
  if (!metadata || Object.keys(metadata).length === 0) return "";
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return "";
  }
};

const displayUser = (item: (typeof store.items)[number]) => {
  if (!item.user) return "—";
  if (item.user.name) return item.user.name;
  return item.user.email;
};

const actionBadgeClass = (value: string) => {
  switch (value) {
    case "CREATE":
      return "bg-success";
    case "UPDATE":
      return "bg-primary";
    case "DELETE":
      return "bg-danger";
    case "LOGIN":
      return "bg-info text-dark";
    case "LOGOUT":
      return "bg-secondary";
    case "CHANGE_PASSWORD":
      return "bg-warning text-dark";
    default:
      return "bg-light text-dark";
  }
};

const deleteSelected = async () => {
  if (!selectedIds.value.length) return;

  const confirmed = window.confirm(
    `Delete ${selectedIds.value.length} selected audit log(s)?`,
  );
  if (!confirmed) return;

  try {
    await handle(async () => {
      deleting.value = true;
      const ids = [...selectedIds.value];
      await bulkDeleteAuditLogs(ids);
      selectedIds.value = selectedIds.value.filter((id) => !ids.includes(id));
      await loadData(store.page);
    }, toastSuccessDeleted("auditLog"));
  } finally {
    deleting.value = false;
  }
};
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
            v-model="search"
            class="form-control"
            placeholder="Search user, action, description..."
          />
        </div>

        <div class="col-md-3">
          <select v-model="action" class="form-select">
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
            v-model="targetTable"
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
