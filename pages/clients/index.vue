<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useClientsStore } from "@/stores/clients";
import { useClientsApi } from "@/composables/useClientsApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import { useListPagePermissions } from "@/composables/useListPagePermissions";

const store = useClientsStore();
const { getClients, deleteClient } = useClientsApi();
const { canCreate, canEdit, canDelete } = useListPagePermissions();
const { handle } = useFormHandler();

const search = ref("");
const isActive = ref<string | "">("");
const deletingId = ref<string | null>(null);

/* ================= FETCH DATA ================= */
const loadData = async (page = 1) => {
  await getClients({
    page,
    limit: store.limit ?? 10,
    search: search.value || undefined,
    isActive: isActive.value === "" ? undefined : isActive.value === "true",
  });
};

onMounted(() => loadData());

/* ================= FILTER ================= */
let timeout: any;
watch(search, () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    loadData(1);
  }, 300);
});

watch(isActive, () => {
  loadData(1);
});

/* ================= ACTIONS ================= */
const remove = async (id: string, clientName?: string | null) => {
  if (!canDelete.value) return;

  const label = clientName?.trim() || "(no name)";
  const confirmed = window.confirm(`Delete client "${label}"?`);
  if (!confirmed) return;

  await handle(async () => {
    deletingId.value = id;

    await deleteClient(id);

    await loadData(store.page);
  }, toastSuccessDeleted("client"));

  deletingId.value = null;
};

/* ================= PAGINATION ================= */
const changePage = (page: number) => {
  if (page < 1 || page > store.totalPages) return;
  loadData(page);
};
</script>

<template>
  <div class="container py-4">
    <!-- HEADER -->
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">Clients</h4>

      <NuxtLink v-if="canCreate" to="/clients/create" class="btn btn-primary">
        + New Client
      </NuxtLink>
    </div>

    <!-- FILTER -->
    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2">
        <div class="col-md-4">
          <input v-model="search" class="form-control" placeholder="Search" />
        </div>

        <div class="col-md-3">
          <select v-model="isActive" class="form-select">
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>
    </div>

    <!-- TABLE -->
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
              <!-- LOADING -->
              <tr v-if="store.loading">
                <td colspan="7" class="text-center py-3">Loading...</td>
              </tr>

              <tr v-for="(c, index) in store.items" :key="c.id">
                <td class="text-center fw-bold">
                    {{ (store.page - 1) * store.limit + index + 1 }}
                  </td>

                  <!-- NAME -->
                  <td>
                    <NuxtLink
                      v-if="canEdit"
                      :to="`/clients/update?id=${c.id}`"
                      class="text-primary fw-semibold text-decoration-none"
                    >
                      {{ c.name }}
                    </NuxtLink>

                    <span v-else>
                      {{ c.name }}
                    </span>
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
                    {{ c.addressText }}
                    <div v-if="c.addressMeta">
                      <div class="data-meta mt-1">
                        {{ c.addressMeta.city }},
                        {{ c.addressMeta.province }}
                      </div>
                    </div>
                  </td>

                  <!-- STATUS + DELETE -->
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
                      <div>Created: {{ c.createdAt || "—" }}</div>
                      <div>Updated: {{ c.updatedAt || "—" }}</div>
                    </div>
                    <span
                      v-if="canDelete"
                      class="text-danger fw-semibold"
                      style="cursor: pointer"
                      @click.stop="remove(c.id, c.name)"
                    >
                      ×
                    </span>
                  </td>
                </tr>

              <!-- EMPTY -->
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

    <!-- SHOWING + PAGINATION -->
    <div
      v-if="store.total !== undefined"
      class="d-flex justify-content-between align-items-center mt-3"
    >
      <div>
        <div class="data-meta">
          Showing
          {{ store.total === 0 ? 0 : (store.page - 1) * store.limit + 1 }}
          -
          {{ Math.min(store.page * store.limit, store.total) }}
          of {{ store.total }} entries
        </div>
      </div>

      <div v-if="store.totalPages > 1">
        <button
          class="btn btn-outline-secondary me-2"
          :disabled="store.page === 1"
          @click="changePage(store.page - 1)"
        >
          Prev
        </button>

        <span class="me-2">
          Page {{ store.page }} of
          {{ store.totalPages }}
        </span>

        <button
          class="btn btn-outline-secondary"
          :disabled="store.page >= store.totalPages"
          @click="changePage(store.page + 1)"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
