<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useProjectsApi } from "@/composables/useProjectsApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessCreated } from "@/composables/useToastMessages";
import { useProjectForm } from "@/composables/useProjectForm";
import { useNotify } from "@/composables/useNotify";
import { useProjectFilesApi } from "@/composables/useProjectFilesApi";
import { useRouter, navigateTo } from "#imports";

import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const router = useRouter();
const auth = useAuthStore();
const { createProject } = useProjectsApi();
const { uploadProjectFile } = useProjectFilesApi();
const { loading, handle } = useFormHandler();
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
  buildPayload,
} = useProjectForm();

const projectNameInput = ref<HTMLInputElement | null>(null);
const uploadInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const fileCategory = ref("po");
const fileCategoryOptions = [
  { value: "po", label: "PO" },
  { value: "wo", label: "WO" },
  { value: "contract", label: "Contract" },
];
const onDocumentChange = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  selectedFile.value = input?.files?.[0] ?? null;
};


/* ================= ROLE GUARD ================= */
if (!["admin", "superadmin"].includes(auth.user?.role || "")) {
  navigateTo("/projects");
}

/* ================= AUTO FOCUS ================= */
onMounted(async () => {
  projectNameInput.value?.focus();

  try {
    await loadClientOptions();
  } catch {
    notify.error(clientsError.value || "Failed to load clients");
  }
});

/* ================= SUBMIT ================= */
const submit = async () => {
  if (!isValid.value) {
    notify.warning(
      "Project name, PR/SC number, PO number, and PO date are required",
    );
    return;
  }

  await handle(async () => {
    const created: any = await createProject(buildPayload());
    const projectId = created?.data?.id as string | undefined;

    if (projectId && selectedFile.value) {
      try {
        await uploadProjectFile({
          refTable: "projects",
          refId: projectId,
          fileCategory: fileCategory.value,
          file: selectedFile.value,
        });
      } catch (err: any) {
        notify.warning(
          err?.data?.message ||
            err?.message ||
            "Project created, but document upload failed",
        );
      } finally {
        selectedFile.value = null;
        if (uploadInput.value) uploadInput.value.value = "";
      }
    }

    await router.replace("/projects");
  }, toastSuccessCreated("project"));
};
</script>

<template>
  <FormShell
    title="Create Project"
    :loading="loading"
    submit-label="Save"
    @submit="submit"
    @cancel="router.back()"
  >
    <!-- ================= BASIC INFO ================= -->
    <FormSection>
      <div class="col-12">
        <label class="form-label">Project Name</label>
        <input
          ref="projectNameInput"
          v-model="form.projectName"
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
        <input v-model="form.prScNumber" class="form-control" required />
      </div>

      <div class="col-12 col-md-6 col-lg-3">
        <label class="form-label">PO Number</label>
        <input v-model="form.poNumber" class="form-control" required />
      </div>

      <div class="col-12 col-md-6 col-lg-3">
        <label class="form-label">PO Date</label>
        <input
          v-model="form.poDate"
          type="date"
          class="form-control"
          required
        />
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
          <option v-for="client in clients" :key="client.id" :value="client.id">
            {{ client.name }}
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
    </FormSection>

    <!-- ================= FINANCIAL ================= -->
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
        <input :value="grandTotal" class="form-control fw-semibold" readonly />
      </div>
    </FormSection>
  </FormShell>
</template>
