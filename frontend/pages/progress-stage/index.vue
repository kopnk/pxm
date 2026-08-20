<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useProgressStageApi } from "@/composables/useProgressStageApi";
import { useProgressStageStore, type ProgressStage } from "@/stores/progressStage";
import { useFormHandler } from "@/composables/useFormHandler";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { toastSuccessDeleted } from "@/composables/useToastMessages";

const store = useProgressStageStore();
const { getProgressStages, deleteProgressStage } = useProgressStageApi();
const { canCreate, canEdit, canDelete } = useListPagePermissions("progress_stage");
const { loading, handle } = useFormHandler();

const search = ref("");
const stageType = ref("");
const activeFilter = ref("");
const showDeleteModal = ref(false);
const deleteTarget = ref<ProgressStage | null>(null);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  await getProgressStages({
    page: store.page,
    limit: store.limit,
    search: search.value,
    stageType: stageType.value,
    isActive:
      activeFilter.value === ""
        ? undefined
        : activeFilter.value === "active",
  });
};

const showingStart = computed(() =>
  store.total === 0 ? 0 : (store.page - 1) * store.limit + 1,
);
const showingEnd = computed(() =>
  Math.min(store.page * store.limit, store.total),
);

const badgeClass = (value: boolean) =>
  value ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary";

const resetToFirstPage = () => {
  store.setPagination({
    page: 1,
    limit: store.limit,
    total: store.total,
    totalPages: store.totalPages,
  });
};

const scheduleFetch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    resetToFirstPage();
    void fetchData();
  }, 250);
};

watch([search, stageType, activeFilter], scheduleFetch);

onMounted(fetchData);

const openDeleteModal = (stage: ProgressStage) => {
  if (!canDelete.value) return;
  deleteTarget.value = stage;
  showDeleteModal.value = true;
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  deleteTarget.value = null;
};

const performDelete = async () => {
  if (!deleteTarget.value) return;

  await handle(async () => {
    await deleteProgressStage(deleteTarget.value!.id);
    await fetchData();
  }, toastSuccessDeleted("progressStage"));

  cancelDelete();
};

const prevPage = () => {
  if (store.page <= 1) return;
  store.setPagination({
    page: store.page - 1,
    limit: store.limit,
    total: store.total,
    totalPages: store.totalPages,
  });
  void fetchData();
};

const nextPage = () => {
  if (store.page >= store.totalPages) return;
  store.setPagination({
    page: store.page + 1,
    limit: store.limit,
    total: store.total,
    totalPages: store.totalPages,
  });
  void fetchData();
};
</script>

<template>
  <div class="container-fluid py-4 px-3">
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <h4 class="text-brand mb-0" data-page-focus>Progress Stage</h4>

      <NuxtLink v-if="canCreate" to="/progress-stage/create" class="btn btn-primary">
        + New Stage
      </NuxtLink>
    </div>

    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2">
        <div class="col-lg-6 col-md-12">
          <input
            v-model="search"
            type="search"
            class="form-control"
            placeholder="Search code, name, type..."
          />
        </div>
        <div class="col-lg-3 col-md-6">
          <select v-model="stageType" class="form-select">
            <option value="">All types</option>
            <option value="admin">Admin</option>
            <option value="field">Field</option>
            <option value="document">Document</option>
          </select>
        </div>
        <div class="col-lg-3 col-md-6">
          <select v-model="activeFilter" class="form-select">
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card shadow-sm border-0">
      <div class="card-body p-0">
        <table class="table table-striped table-users mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th width="50">No</th>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Sequence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="store.loading">
              <td colspan="6" class="text-center py-4 text-muted">Loading...</td>
            </tr>
            <tr v-for="(item, index) in store.items" :key="item.id">
              <td class="text-center fw-semibold">
                {{ (store.page - 1) * store.limit + index + 1 }}
              </td>
              <td>
                <NuxtLink
                  v-if="canEdit"
                  :to="`/progress-stage/update?id=${item.id}`"
                  class="text-primary fw-semibold text-decoration-none"
                >
                  {{ item.code }}
                </NuxtLink>
                <span v-else>{{ item.code }}</span>
              </td>
              <td>{{ item.name }}</td>
              <td class="text-capitalize">{{ item.stageType }}</td>
              <td>{{ item.sequence }}</td>
              <td>
                <span class="badge" :class="badgeClass(item.isActive)">
                  {{ item.isActive ? "Active" : "Inactive" }}
                </span>
                <AppAuditMeta
                  :created-by="item.createdBy"
                  :updated-by="item.updatedBy"
                  :created-at="item.createdAt"
                  :updated-at="item.updatedAt"
                />
                <button
                  v-if="canDelete"
                  type="button"
                  class="btn btn-link btn-sm text-danger text-decoration-none p-0 mt-1"
                  @click="openDeleteModal(item)"
                >
                  x
                </button>
              </td>
            </tr>
            <tr v-if="!store.loading && store.items.length === 0">
              <td colspan="6" class="text-center py-4 text-muted">No data</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
      <div class="data-meta">
        Showing {{ showingStart }} - {{ showingEnd }} of {{ store.total }} entries
      </div>
      <AppPagination
        :current-page="store.page"
        :total-pages="store.totalPages"
        @prev="prevPage"
        @next="nextPage"
      />
    </div>

    <AppConfirmDialog
      :visible="showDeleteModal"
      title="Confirm delete"
      confirm-label="Delete"
      confirm-variant="danger"
      focus-target="cancel"
      :loading="loading"
      @cancel="cancelDelete"
      @confirm="performDelete"
    >
      <p class="mb-0">
        Delete progress stage
        <span class="fw-bold">{{ deleteTarget?.name || deleteTarget?.code }}</span>?
      </p>
    </AppConfirmDialog>
  </div>
</template>
