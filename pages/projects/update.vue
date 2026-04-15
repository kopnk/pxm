<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProjectsApi } from "@/composables/useProjectsApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import { useProjectForm } from "@/composables/useProjectForm";
import { useNotify } from "@/composables/useNotify";
import {
  useProjectFilesApi,
  type ProjectFileItem,
} from "@/composables/useProjectFilesApi";
import { useAuthStore } from "@/stores/auth";

import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

definePageMeta({});

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { getProjectById, updateProject } = useProjectsApi();
const { getProjectFiles, uploadProjectFile, deleteProjectFile } = useProjectFilesApi();
const { loading: saving, handle } = useFormHandler();
const notify = useNotify();
const {
  form,
  clients,
  clientsError,
  isValid,
  netPrice,
  vatAmount,
  grandTotal,
  formatCurrency,
  loadClientOptions,
  fillFromProject,
  buildPayload,
} = useProjectForm();

const id = typeof route.query.id === "string" ? route.query.id : undefined;

if (!id) {
  router.replace("/projects");
}

const loading = ref(false);
const formLoading = computed(() => loading.value || saving.value);
const selectedFile = ref<File | null>(null);
const uploadInput = ref<HTMLInputElement | null>(null);
const projectFiles = ref<ProjectFileItem[]>([]);
const deletingFileId = ref<string | null>(null);
const fileCategory = ref("po");
const fileCategoryOptions = [
  { value: "po", label: "PO" },
  { value: "wo", label: "WO" },
  { value: "contract", label: "Contract" },
];
const canDeleteFile = computed(() => auth.user?.role === "superadmin");

const loadProjectFiles = async () => {
  if (!id) return;
  projectFiles.value = await getProjectFiles({
    refTable: "projects",
    refId: id,
    limit: 50,
  });
};

const fetchProject = async () => {
  if (!id) return;

  loading.value = true;

  try {
    const project = await getProjectById(id);
    fillFromProject(project);
  } catch (err: any) {
    notify.error(
      err?.data?.message || err?.message || "Failed to load project",
    );
    router.replace("/projects");
    return;
  } finally {
    loading.value = false;
  }

  try {
    await loadClientOptions();
  } catch {
    notify.error(clientsError.value || "Failed to load clients");
  }

  try {
    await loadProjectFiles();
  } catch {
    notify.warning("Failed to load project documents");
  }
};

const onDocumentChange = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  selectedFile.value = input?.files?.[0] ?? null;
};

const handleSubmit = async () => {
  if (!id) return;

  if (!isValid.value) {
    notify.warning(
      "Project name, PR/SC number, PO number, and PO date are required",
    );
    return;
  }

  await handle(async () => {
    await updateProject(id, buildPayload());

    if (selectedFile.value) {
      await uploadProjectFile({
        refTable: "projects",
        refId: id,
        fileCategory: fileCategory.value,
        file: selectedFile.value,
      });

      await loadProjectFiles();

      selectedFile.value = null;
      if (uploadInput.value) uploadInput.value.value = "";
    }

    router.push("/projects");
  }, toastSuccessUpdated("project"));
};

const removeFile = async (fileId: string) => {
  if (!canDeleteFile.value) return;
  if (!window.confirm("Delete this document permanently?")) return;

  deletingFileId.value = fileId;
  try {
    await deleteProjectFile(fileId);
    await loadProjectFiles();
    notify.success("Document deleted");
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || "Failed to delete document");
  } finally {
    deletingFileId.value = null;
  }
};

onMounted(fetchProject);
</script>

<template>
  <FormShell
    title="Update Project"
    :loading="formLoading"
    submit-label="Update"
    @submit="handleSubmit"
    @cancel="router.back()"
  >
    <div v-if="loading" class="text-center py-4">Loading...</div>

    <template v-else>
      <FormSection>
        <div class="col-12">
          <label class="form-label">Project Name</label>
          <input
            v-model="form.projectName"
            type="text"
            class="form-control"
            required
          />
        </div>

        <div class="col-12 col-md-6 col-lg-3">
          <label class="form-label">Contract Number</label>
          <input v-model="form.contractNumber" class="form-control" />
        </div>

        <div class="col-12 col-md-6 col-lg-3">
          <label class="form-label">PR/SC Number</label>
          <input v-model="form.prScNumber" class="form-control" />
        </div>

        <div class="col-12 col-md-6 col-lg-3">
          <label class="form-label">PO Number</label>
          <input v-model="form.poNumber" class="form-control" />
        </div>

        <div class="col-12 col-md-6 col-lg-3">
          <label class="form-label">PO Date</label>
          <input v-model="form.poDate" type="date" class="form-control" />
        </div>

        <div class="col-12 col-md-6 col-lg-3">
          <label class="form-label">Delivery Date</label>
          <input v-model="form.deliveryDate" type="date" class="form-control" />
        </div>

        <div class="col-12 col-md-6 col-lg-3">
          <label class="form-label">KOM Date</label>
          <input v-model="form.komDate" type="date" class="form-control" />
        </div>

        <div class="col-12 col-md-6 col-lg-3">
          <label class="form-label">Status</label>
          <select v-model="form.status" class="form-select">
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div class="col-12 col-md-6 col-lg-3">
          <label class="form-label">PM</label>
          <input v-model="form.pm" class="form-control" />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Client</label>
          <select v-model="form.clientId" class="form-select">
            <option value="">- None -</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Document Category</label>
          <select v-model="fileCategory" class="form-select mb-2">
            <option
              v-for="opt in fileCategoryOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <label class="form-label">Project Document</label>
          <input
            ref="uploadInput"
            class="form-control"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            @change="onDocumentChange"
          />
          <div class="data-meta mt-1">
            {{
              selectedFile
                ? `Selected: ${selectedFile.name}`
                : "Optional. Allowed: PDF, PNG, JPG (max 10MB)"
            }}
          </div>
        </div>

        <div class="col-12">
          <label class="form-label">Existing Documents</label>
          <div v-if="projectFiles.length === 0" class="data-meta">
            No document uploaded yet.
          </div>
          <div v-else class="d-flex flex-column gap-1">
            <div
              v-for="file in projectFiles"
              :key="file.id"
              class="d-flex align-items-center justify-content-between gap-2"
            >
              <a
                :href="file.fileUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-decoration-none"
              >
                [{{ String(file.fileCategory || "contract").toUpperCase() }}]
                {{ file.fileName || "Unnamed file" }}
              </a>
              <button
                v-if="canDeleteFile"
                type="button"
                class="btn btn-sm btn-outline-danger px-2 py-0"
                :disabled="deletingFileId === file.id"
                title="Delete document"
                @click="removeFile(file.id)"
              >
                {{ deletingFileId === file.id ? "..." : "🗑" }}
              </button>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Financial Summary">
        <div class="col-12 col-md-6">
          <label class="form-label">PO Price</label>
          <input
            v-model.number="form.subTotal"
            type="number"
            class="form-control"
          />
          <div class="data-meta mt-1">
            {{ formatCurrency(form.subTotal) }}
          </div>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Discount</label>
          <input
            v-model.number="form.discount"
            type="number"
            class="form-control"
          />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">VAT Rate (%)</label>
          <input
            v-model.number="form.vatRate"
            type="number"
            class="form-control"
          />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Net Price</label>
          <input :value="netPrice" class="form-control" readonly />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">VAT Amount</label>
          <input :value="vatAmount" class="form-control" readonly />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Grand Total</label>
          <input
            :value="grandTotal"
            class="form-control fw-semibold"
            readonly
          />
        </div>
      </FormSection>
    </template>
  </FormShell>
</template>
