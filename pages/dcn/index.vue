<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useDcnApi, DCN_OUT_TYPE_OPTIONS } from "@/composables/useDcnApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessDeleted } from "@/composables/useToastMessages";

const auth = useAuthStore();
const { store, getDcns, deleteDcn } = useDcnApi();
const { handle } = useFormHandler();

const search = ref("");
const flow = ref<"" | "in" | "out">("");
const type = ref("");
const deletingId = ref<string | null>(null);

const canCreate = computed(() =>
  ["admin", "superadmin"].includes(auth.user?.role || ""),
);
const canEdit = computed(() =>
  ["admin", "superadmin"].includes(auth.user?.role || ""),
);
const canDelete = computed(() => auth.user?.role === "superadmin");

const loadData = async (page = 1) => {
  await getDcns({
    page,
    limit: store.limit ?? 10,
    search: search.value || undefined,
    flow: flow.value || undefined,
    type: flow.value === "out" && type.value ? type.value : undefined,
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

watch([flow, type], ([nextFlow]) => {
  if (nextFlow !== "out") type.value = "";
  void loadData(1);
});

const changePage = (page: number) => {
  if (page < 1 || page > store.totalPages) return;
  void loadData(page);
};

const remove = async (id: string) => {
  if (!canDelete.value) return;
  await handle(async () => {
    deletingId.value = id;
    await deleteDcn(id);
    await loadData(store.page);
  }, toastSuccessDeleted("dcn"));
  deletingId.value = null;
};

const flowBadgeClass = (value: string) =>
  value === "out" ? "bg-warning text-dark" : "bg-info text-dark";

const typeLabelByCode = DCN_OUT_TYPE_OPTIONS.reduce<Record<string, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {},
);

const displayType = (value: string | null | undefined) => {
  if (!value) return "—";
  return typeLabelByCode[value] ?? value;
};
</script>

<template>
  <div class="container py-4">
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
            v-model="search"
            class="form-control"
            placeholder="Search"
          />
        </div>

        <div class="col-md-3">
          <select v-model="flow" class="form-select">
            <option value="">All Flow</option>
            <option value="in">In</option>
            <option value="out">Out</option>
          </select>
        </div>

        <div class="col-md-3">
          <select v-model="type" class="form-select" :disabled="flow !== 'out'">
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
                  <div class="data-meta">Created: {{ item.createdAt || "—" }}</div>
                  <div class="data-meta">Updated: {{ item.updatedAt || "—" }}</div>
                  <div v-if="canDelete" class="mt-1">
                    <span
                      class="text-danger small fw-semibold"
                      style="cursor: pointer"
                      @click.stop="remove(item.id)"
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
        Showing
        {{ store.total === 0 ? 0 : (store.page - 1) * store.limit + 1 }}
        -
        {{ Math.min(store.page * store.limit, store.total) }}
        of {{ store.total }} entries
      </div>

      <div v-if="store.totalPages > 1">
        <button
          class="btn btn-outline-secondary me-2"
          :disabled="store.page === 1"
          @click="changePage(store.page - 1)"
        >
          Prev
        </button>
        <span class="me-2">Page {{ store.page }} of {{ store.totalPages }}</span>
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
