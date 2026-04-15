<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "#imports";
import { usePartnersStore } from "@/stores/partners";
import { usePartnersApi } from "@/composables/usePartnersApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import { useListPagePermissions } from "@/composables/useListPagePermissions";

const router = useRouter();
const store = usePartnersStore();
const { getPartners, deletePartner } = usePartnersApi();
const { canCreate, canEdit, canDelete } = useListPagePermissions();
const { handle } = useFormHandler();

const search = ref("");
const isActive = ref<boolean | undefined>(undefined);

/* ================= LOAD ================= */
const loadData = async () => {
  store.setLoading(true);

  const res: any = await getPartners({
    page: store.page,
    limit: store.limit,
    search: search.value || undefined,
    isActive: isActive.value,
  });

  store.setPartners(res.data);
  store.setLoading(false);

};

onMounted(loadData);

/* ================= FILTER ================= */
watch([search, isActive], () => {
  store.page = 1;
  loadData();
});

/* ================= PAGINATION ================= */
const changePage = (page: number) => {
  store.page = page;
  loadData();
};

/* ================= ACTIONS ================= */
const goCreate = () => router.push("/partners/create");

const goEdit = (id: string) => {
  if (!canEdit.value) return;
  router.push({ path: "/partners/update", query: { id } });
};

const remove = async (id: string) => {
  const confirmed = confirm("Delete this partner?");
  if (!confirmed) return;

  await handle(async () => {
    await deletePartner(id);
    await loadData();
  }, toastSuccessDeleted("partner"));
};
</script>

<template>
  <div class="container py-4">
    <!-- HEADER -->
    <div
      class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3"
    >
      <h4 class="text-brand mb-0">Partners</h4>

      <button v-if="canCreate" class="btn btn-primary" @click="goCreate">
        + New Partner
      </button>
    </div>

    <!-- FILTER -->
    <div class="card mb-3 border-0 shadow-sm">
      <div class="card-body row g-2">
        <div class="col-md-4">
          <input
            v-model="search"
            class="form-control"
            placeholder="Search name..."
          />
        </div>

        <div class="col-md-3">
          <select v-model="isActive" class="form-select">
            <option :value="undefined">All</option>
            <option :value="true">Active</option>
            <option :value="false">Inactive</option>
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

              <tr v-for="(p, index) in store.items" :key="p.id">
                <td class="text-center fw-bold">
                    {{ (store.page - 1) * store.limit + index + 1 }}
                  </td>

                  <td>
                    <span
                      v-if="canEdit"
                      class="text-primary fw-semibold"
                      style="cursor: pointer"
                      @click="goEdit(p.id)"
                    >
                      {{ p.name }}
                    </span>

                    <span v-else>
                      {{ p.name }}
                    </span>
                    <div class="data-meta mt-1">{{ p.contactEmail || "—" }}</div>
                  </td>

                  <td>{{ p.npwp }}</td>
                  <td>
                    <div class="fw-semibold">{{ p.bankName || "—" }}</div>
                    <div class="data-meta">{{ p.bankAccount || "—" }}</div>
                  </td>
                  <td>
                    <div class="fw-semibold">{{ p.contactName || "—" }}</div>
                    <div class="data-meta">{{ p.contactPhone || "—" }}</div>
                  </td>
                  <td>
                    {{ p.addressText || "—" }}
                    <div v-if="p.addressMeta">
                      <div class="data-meta mt-1">
                        {{ p.addressMeta.city }},
                        {{ p.addressMeta.province }}
                      </div>
                    </div>
                  </td>

                  <!-- STATUS + DELETE -->
                  <td>
                    <div>
                      <span
                        class="badge me-2"
                        :class="p.isActive ? 'bg-success' : 'bg-danger'"
                      >
                        {{ p.isActive ? "Active" : "Inactive" }}
                      </span>
                    </div>
                    <div class="data-meta mt-1">
                      <div>Created: {{ p.createdAt || "—" }}</div>
                      <div>Updated: {{ p.updatedAt || "—" }}</div>
                    </div>
                    <span
                      v-if="canDelete"
                      class="text-danger fw-semibold"
                      style="cursor: pointer"
                      @click.stop="remove(p.id)"
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
