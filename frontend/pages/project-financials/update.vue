<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProjectFinancialsApi } from "@/composables/useProjectFinancialsApi";
import { useProjectFilesApi } from "@/composables/useProjectFilesApi";
import {
  financialDocCategories,
  saveFinancialDocuments,
} from "@/composables/useProjectFinancialDocuments";
import {
  PROJECT_FILE_REF_TABLE,
  useRefDocumentFields,
} from "@/composables/useProjectRefDocuments";
import { useProjectRefFilesList } from "@/composables/useProjectRefFilesList";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import { useNotify } from "@/composables/useNotify";
import { apiFetch } from "~/utils/apiFetch";
import {
  emptyProjectFinancialForm,
  applyFinancialRowToForm,
  buildProjectFinancialPayload,
  pfPartnerLineBase,
  pfClientLineBase,
  pfAmountFromPercent,
} from "@/composables/useProjectFinancialForm";
import { formatProjectDetailSelectLabel } from "~/utils/formatProjectDetailSelectLabel";
import { toProjectSelectOptions } from "~/utils/projectSelectOptions";
import DecimalInput from "@/components/form/DecimalInput.vue";
import FinancialDocumentUrlFile from "@/components/form/FinancialDocumentUrlFile.vue";
import FinancialDocumentExistingList from "@/components/form/FinancialDocumentExistingList.vue";

definePageMeta({});

const route = useRoute();
const router = useRouter();
const id = route.query.id as string | undefined;

const { getProjectFinancialById, updateProjectFinancial } =
  useProjectFinancialsApi();
const { uploadProjectFile, createProjectFileByUrl } = useProjectFilesApi();
const { loading, handle } = useFormHandler();
const notify = useNotify();

const projects = ref<
  { id: string; projectName?: string; poNumber?: string; poDate?: string | null }[]
>([]);
const clientsList = ref<{ id: string; name?: string | null }[]>([]);
const partnersList = ref<{ id: string; name?: string | null }[]>([]);
const details = ref<
  {
    id: string;
    siteName?: string;
    materialName?: string;
    systemkey?: string;
    siteId?: string;
  }[]
>([]);
const pageLoading = ref(true);

const form = reactive(emptyProjectFinancialForm());
const {
  files: selectedDocFiles,
  urls: selectedDocUrls,
  syncSlots: syncDocSlots,
  setUrl: setDocUrl,
  setFileFromEvent: onDocFileChange,
  reset: resetDocumentFields,
  hasPending: hasPendingDocuments,
} = useRefDocumentFields(financialDocCategories);
syncDocSlots();

const {
  deletingFileId,
  showDeleteModal: showDeleteFileModal,
  deleteTargetFile,
  canDelete: canDeleteDoc,
  docsForCategory,
  load: loadProjectFiles,
  requestDelete: requestDeleteProjectFile,
  cancelDelete: cancelDeleteProjectFile,
  remove: removeProjectFile,
  deleteMessage: projectFileDeleteMessage,
} = useProjectRefFilesList(PROJECT_FILE_REF_TABLE.FINANCIALS, () => id);

const selectedProject = computed(() =>
  projects.value.find((p) => p.id === form.projectId),
);

const selectedDetail = computed(() =>
  details.value.find((d) => d.id === form.projectDetailId),
);
const projectSelectOptions = computed(() => toProjectSelectOptions(projects.value));
const detailSelectOptions = computed(() =>
  details.value.map((d) => ({ value: d.id, label: formatProjectDetailSelectLabel(d) })),
);
const isInFlow = computed(() => form.flowDirection === "in");
const isOutFlow = computed(() => form.flowDirection === "out");

const partnerPoPdfHref = computed(() => {
  const po = form.poNumberPartner?.trim();
  if (!po) return "#";
  return `/api/reports/partner-po-pdf?po=${encodeURIComponent(po)}`;
});

const partnerBastPdfHref = computed(() => {
  const bast = form.bastNumber?.trim();
  if (!bast) return "#";
  return `/api/reports/partner-bast-pdf?bast=${encodeURIComponent(bast)}`;
});

const partnerInvoicePdfHref = computed(() => {
  const invoice = form.invoiceNumberPartner?.trim();
  if (!invoice) return "#";
  return `/api/reports/partner-invoice-pdf?invoice=${encodeURIComponent(invoice)}`;
});

const partnerEprPdfHref = computed(() => {
  const po = form.poNumberPartner?.trim();
  if (!po) return "#";
  return `/api/reports/partner-epr-pdf?po=${encodeURIComponent(po)}`;
});

const partnerTotalPreview = computed(() => {
  const bp = pfPartnerLineBase(form.qtyPartner, form.unitPricePartner);
  if (bp == null) return null;
  const pph = pfAmountFromPercent(bp, form.pphPercent) ?? 0;
  const tin = pfAmountFromPercent(bp, form.taxInPercent) ?? 0;
  return bp - pph + tin;
});

const clientTotalPreview = computed(() => {
  const bc = pfClientLineBase(form.qtyClient, form.unitPriceClient);
  if (bc == null) return null;
  const tout = pfAmountFromPercent(bc, form.taxOutPercent) ?? 0;
  return bc + tout;
});

const clientInvoicePdfHref = computed(() => {
  const invoice = form.invoiceNumberClient?.trim();
  const clientId = form.clientId?.trim();
  if (!invoice || !clientId) return "#";
  const query = new URLSearchParams({
    invoice,
    clientId,
  });
  return `/api/reports/client-invoice-pdf?${query.toString()}`;
});

const fmtMoney = (v: number | null) => {
  if (v === null) return "—";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v);
};

const loadProjects = async () => {
  const res = await apiFetch<{ data: { items: typeof projects.value } }>(
    "/api/projects",
    { query: { limit: 500 } },
  );
  projects.value = res.data.items;
};

const loadClientsList = async () => {
  const res = await apiFetch<{ data: { items: typeof clientsList.value } }>(
    "/api/clients",
    { query: { limit: 500 } },
  );
  clientsList.value = res.data.items ?? [];
};

const loadPartnersList = async () => {
  const res = await apiFetch<{ data: { items: typeof partnersList.value } }>(
    "/api/partners",
    { query: { limit: 500 } },
  );
  partnersList.value = res.data.items ?? [];
};

const loadDetails = async (projectId: string) => {
  if (!projectId) {
    details.value = [];
    return;
  }
  const res = await apiFetch<{ data: { items: typeof details.value } }>(
    "/api/project_details",
    { query: { projectId, limit: 1000 } },
  );
  details.value = res.data.items ?? [];
};

const syncClientPoFromProject = () => {
  if (form.flowDirection !== "out") return;
  const project = selectedProject.value;
  form.poNumberClient = project?.poNumber ?? "";
  form.poDateClient = project?.poDate ?? "";
};

watch(
  () => form.projectId,
  async (pid) => {
    await loadDetails(pid);
    syncClientPoFromProject();
  },
);

watch(
  () => form.flowDirection,
  (flow) => {
    if (flow === "in") {
      form.taxOutPercent = null;
    } else {
      form.taxInPercent = null;
      form.pphPercent = null;
    }
  },
);

onMounted(async () => {
  if (!id) {
    await router.replace("/project-financials");
    return;
  }
  await Promise.all([loadProjects(), loadClientsList(), loadPartnersList()]);
  const res = (await getProjectFinancialById(id)) as {
    data: Record<string, unknown>;
  };
  applyFinancialRowToForm(res.data, form);
  await loadDetails(form.projectId);
  syncClientPoFromProject();
  try {
    await loadProjectFiles();
  } catch (err: any) {
    notify.warning(
      err?.data?.message || err?.message || "Failed to load saved documents",
    );
  }
  pageLoading.value = false;
});

const handleSubmit = async () => {
  if (!id) return;
  if (!form.projectDetailId) throw new Error("Project detail is required");
  if (form.stage != null && form.stage < 1)
    throw new Error("Stage must be at least 1");
  if (isInFlow.value && !form.partnerId.trim())
    throw new Error("Partner is required");
  if (isOutFlow.value && !form.clientId.trim())
    throw new Error("Client is required");

  await updateProjectFinancial(id, buildProjectFinancialPayload(form));

  const hadPendingDocs = hasPendingDocuments();

  if (hadPendingDocs) {
    try {
      await saveFinancialDocuments(
        { uploadProjectFile, createProjectFileByUrl },
        id,
        selectedDocFiles,
        selectedDocUrls,
      );
      resetDocumentFields();
    } catch (err: any) {
      notify.warning(
        err?.data?.message ||
          err?.message ||
          "Project financial updated, but document save failed",
      );
      throw err;
    }
  }

  await router.push("/project-financials");
};
</script>

<template>
  <div v-if="pageLoading" class="container py-4 text-muted">Loading…</div>
  <FormShell
    v-else
    title="Update Project Financial"
    :loading="loading"
    submit-label="Update"
    @submit="
      () => handle(handleSubmit, toastSuccessUpdated('projectFinancial'))
    "
    @cancel="() => router.push('/project-financials')"
  >
    <FormSection title="Project &amp; Detail">
      <div class="col-md-6">
        <label class="form-label">Project</label>
        <FormScrollableSelect v-model="form.projectId" :options="projectSelectOptions" placeholder="Select Project" name="projectId" required />
      </div>
      <div class="col-md-6">
        <label class="form-label">Project Detail</label>
        <FormScrollableSelect v-model="form.projectDetailId" :options="detailSelectOptions" placeholder="Select Project Detail" :disabled="!form.projectId" name="projectDetailId" required />
      </div>

      <div class="col-12">
        <div
          v-if="selectedProject || selectedDetail"
          class="border rounded p-3 bg-light small"
        >
          <div class="row g-2">
            <div class="col-md-6">
              <div class="text-uppercase text-muted fw-semibold mb-1">
                Description (Preview)
              </div>
              <div>
                <span class="text-muted">PO</span>
                {{ selectedProject?.poNumber || "—" }}
              </div>
              <div>
                <span class="text-muted">Project Name</span>
                {{ selectedProject?.projectName || "—" }}
              </div>
              <div>
                <span class="text-muted">Material</span>
                {{ selectedDetail?.materialName || "—" }}
              </div>
            </div>
            <div class="col-md-6">
              <div class="text-uppercase text-muted fw-semibold mb-1">
                Site (Preview)
              </div>
              <div>
                <span class="text-muted">Systemkey</span>
                {{ selectedDetail?.systemkey || "—" }}
              </div>
              <div>
                <span class="text-muted">Site ID</span>
                {{ selectedDetail?.siteId || "—" }}
              </div>
              <div>
                <span class="text-muted">Site Name</span>
                {{ selectedDetail?.siteName || "—" }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </FormSection>

    <FormSection title="Flow">
      <div class="col-md-4">
        <label class="form-label">Flow</label>
        <select v-model="form.flowDirection" class="form-select" disabled>
          <option value="in">In (Partner Side)</option>
          <option value="out">Out (Client Side)</option>
        </select>
        <div class="form-text">
          Flow is locked on update to keep In/Out lines separated.
        </div>
      </div>
    </FormSection>

    <FormSection v-if="isInFlow" title="Partner Details">
      <div class="col-md-3">
        <label class="form-label">Partner Qty</label>
        <DecimalInput v-model="form.qtyPartner" />
        <div class="number-helper number-helper-muted">
          {{ fmtMoney(form.qtyPartner) }}
        </div>
      </div>
      <div class="col-md-3">
        <label class="form-label">Partner Unit Price</label>
        <DecimalInput v-model="form.unitPricePartner" />
        <div class="number-helper">
          {{ fmtMoney(form.unitPricePartner) }}
        </div>
      </div>
      <div class="col-md-3">
        <label class="form-label">PPH (%)</label>
        <DecimalInput v-model="form.pphPercent" :min="0" />
        <div class="number-helper number-helper-muted">
          {{ fmtMoney(form.pphPercent) }}%
        </div>
      </div>
      <div class="col-md-3">
        <label class="form-label">Tax In (%)</label>
        <DecimalInput v-model="form.taxInPercent" :min="0" />
        <div class="number-helper number-helper-muted">
          {{ fmtMoney(form.taxInPercent) }}%
        </div>
      </div>
      <div class="col-12">
        <div class="alert alert-secondary py-2 mb-0 small">
          <div>
            <span class="fw-bold">Total (preview):</span>
            {{ fmtMoney(partnerTotalPreview) }}
          </div>
          <div class="data-meta mt-1 mb-0">
            PPH and tax in are entered as a percentage of the partner line (qty
            x unit). IDR amounts are calculated when you save.
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <label class="form-label">Partner PO</label>
        <input v-model="form.poNumberPartner" class="form-control" />
        <div class="data-meta mt-1">
          <a
            v-if="form.poNumberPartner?.trim()"
            :href="partnerPoPdfHref"
            target="_blank"
            rel="noopener noreferrer"
          >
            Print PO
          </a>
          <span v-else class="text-muted">Enter PO number to open PDF</span>
        </div>
      </div>
      <div class="col-md-3">
        <label class="form-label">Partner PO Date</label>
        <input v-model="form.poDatePartner" type="date" class="form-control" />
      </div>
      <FinancialDocumentUrlFile
        :model-value="selectedDocUrls.partner_po ?? ''"
        @update:model-value="setDocUrl('partner_po', $event)"
        file-label="Partner PO File"
        :selected-file-name="selectedDocFiles.partner_po?.name ?? null"
        @file-change="onDocFileChange('partner_po', $event)"
      />
      <FinancialDocumentExistingList
        :files="docsForCategory('partner_po')"
        :can-delete="canDeleteDoc"
        :deleting-id="deletingFileId"
          @delete="requestDeleteProjectFile"
      />
      <div class="col-md-3">
        <label class="form-label">Partner Invoice</label>
        <input v-model="form.invoiceNumberPartner" class="form-control" />
        <div class="data-meta mt-1">
          <a
            v-if="form.invoiceNumberPartner?.trim()"
            :href="partnerInvoicePdfHref"
            target="_blank"
            rel="noopener noreferrer"
            class="me-2"
          >
            Print INV
          </a>
          <a
            :href="partnerEprPdfHref"
            target="_blank"
            rel="noopener noreferrer"
            :class="{ 'text-muted': !form.poNumberPartner?.trim() }"
          >
            EPR
          </a>
        </div>
      </div>
      <div class="col-md-3">
        <label class="form-label">Partner Invoice Date</label>
        <input
          v-model="form.invoiceDatePartner"
          type="date"
          class="form-control"
        />
      </div>
      <FinancialDocumentUrlFile
        :model-value="selectedDocUrls.partner_invoice ?? ''"
        @update:model-value="setDocUrl('partner_invoice', $event)"
        file-label="Partner Invoice File"
        :selected-file-name="selectedDocFiles.partner_invoice?.name ?? null"
        @file-change="onDocFileChange('partner_invoice', $event)"
      />
      <FinancialDocumentExistingList
        :files="docsForCategory('partner_invoice')"
        :can-delete="canDeleteDoc"
        :deleting-id="deletingFileId"
          @delete="requestDeleteProjectFile"
      />
      <div class="col-md-3">
        <label class="form-label">Partner Tax Invoice (FP)</label>
        <input v-model="form.fpNumberPartner" class="form-control" />
      </div>
      <div class="col-md-3">
        <label class="form-label">Partner FP Date</label>
        <input v-model="form.fpDatePartner" type="date" class="form-control" />
      </div>
      <FinancialDocumentUrlFile
        :model-value="selectedDocUrls.partner_tax ?? ''"
        @update:model-value="setDocUrl('partner_tax', $event)"
        file-label="Partner FP File"
        :selected-file-name="selectedDocFiles.partner_tax?.name ?? null"
        @file-change="onDocFileChange('partner_tax', $event)"
      />
      <FinancialDocumentExistingList
        :files="docsForCategory('partner_tax')"
        :can-delete="canDeleteDoc"
        :deleting-id="deletingFileId"
          @delete="requestDeleteProjectFile"
      />
      <div class="col-md-3">
        <label class="form-label">Balap Number</label>
        <input v-model="form.balapNumber" class="form-control" />
      </div>
      <div class="col-md-3">
        <label class="form-label">Balap Date</label>
        <input v-model="form.balapDate" type="date" class="form-control" />
      </div>
      <FinancialDocumentUrlFile
        :model-value="selectedDocUrls.balap ?? ''"
        @update:model-value="setDocUrl('balap', $event)"
        file-label="Balap File"
        :selected-file-name="selectedDocFiles.balap?.name ?? null"
        @file-change="onDocFileChange('balap', $event)"
      />
      <FinancialDocumentExistingList
        :files="docsForCategory('balap')"
        :can-delete="canDeleteDoc"
        :deleting-id="deletingFileId"
          @delete="requestDeleteProjectFile"
      />
      <div class="col-md-3">
        <label class="form-label">BAST Number</label>
        <input v-model="form.bastNumber" class="form-control" />
        <div class="data-meta mt-1">
          <a
            v-if="form.bastNumber?.trim()"
            :href="partnerBastPdfHref"
            target="_blank"
            rel="noopener noreferrer"
          >
            Print BAST
          </a>
          <span v-else class="text-muted">Enter BAST number to open PDF</span>
        </div>
      </div>
      <div class="col-md-3">
        <label class="form-label">BAST Date</label>
        <input v-model="form.bastDate" type="date" class="form-control" />
      </div>
      <FinancialDocumentUrlFile
        :model-value="selectedDocUrls.bast ?? ''"
        @update:model-value="setDocUrl('bast', $event)"
        file-label="BAST File"
        :selected-file-name="selectedDocFiles.bast?.name ?? null"
        @file-change="onDocFileChange('bast', $event)"
      />
      <FinancialDocumentExistingList
        :files="docsForCategory('bast')"
        :can-delete="canDeleteDoc"
        :deleting-id="deletingFileId"
          @delete="requestDeleteProjectFile"
      />

      <div class="col-md-4">
        <label class="form-label">VB Number</label>
        <input v-model="form.vbNumber" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">VB Date</label>
        <input v-model="form.vbDate" type="date" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">MCM Number</label>
        <input v-model="form.mcmNumber" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">MCM Date</label>
        <input v-model="form.mcmDate" type="date" class="form-control" />
      </div>

      <div class="col-md-12">
        <label class="form-label">Partner</label>
        <select v-model="form.partnerId" class="form-select" required>
          <option value="">Select Partner</option>
          <option v-for="m in partnersList" :key="m.id" :value="m.id">
            {{ m.name || "—" }}
          </option>
        </select>
      </div>
    </FormSection>

    <FormSection v-if="isOutFlow" title="Client Details">
      <div class="col-md-4">
        <label class="form-label">Client Qty</label>
        <DecimalInput v-model="form.qtyClient" />
        <div class="number-helper number-helper-muted">
          {{ fmtMoney(form.qtyClient) }}
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label">Client Unit Price</label>
        <DecimalInput v-model="form.unitPriceClient" />
        <div class="number-helper">
          {{ fmtMoney(form.unitPriceClient) }}
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label">Tax Out (%)</label>
        <DecimalInput v-model="form.taxOutPercent" :min="0" />
        <div class="number-helper number-helper-muted">
          {{ fmtMoney(form.taxOutPercent) }}%
        </div>
      </div>
      <div class="col-12">
        <div class="alert alert-secondary py-2 mb-0 small">
          <div>
            <span class="fw-bold">Total (preview):</span>
            {{ fmtMoney(clientTotalPreview) }}
          </div>
          <div class="data-meta mt-1 mb-0">
            Tax out is entered as a percentage of the client line (qty x unit).
            IDR amount is calculated when you save.
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <label class="form-label">Client PO</label>
        <input v-model="form.poNumberClient" class="form-control" disabled />
      </div>
      <div class="col-md-3">
        <label class="form-label">Client PO Date</label>
        <input
          v-model="form.poDateClient"
          type="date"
          class="form-control"
          disabled
        />
      </div>
      <FinancialDocumentUrlFile
        :model-value="selectedDocUrls.client_po ?? ''"
        @update:model-value="setDocUrl('client_po', $event)"
        file-label="Client PO File"
        :selected-file-name="selectedDocFiles.client_po?.name ?? null"
        @file-change="onDocFileChange('client_po', $event)"
      />
      <FinancialDocumentExistingList
        :files="docsForCategory('client_po')"
        :can-delete="canDeleteDoc"
        :deleting-id="deletingFileId"
          @delete="requestDeleteProjectFile"
      />
      <div class="col-md-3">
        <label class="form-label">Client Invoice</label>
        <input v-model="form.invoiceNumberClient" class="form-control" />
        <div class="data-meta mt-1">
          <a
            v-if="form.invoiceNumberClient?.trim() && form.clientId?.trim()"
            :href="clientInvoicePdfHref"
            target="_blank"
            rel="noopener noreferrer"
          >
            Print INV
          </a>
          <span v-else class="text-muted">
            Select client and enter invoice number to open PDF
          </span>
        </div>
      </div>
      <div class="col-md-3">
        <label class="form-label">Client Invoice Date</label>
        <input
          v-model="form.invoiceDateClient"
          type="date"
          class="form-control"
        />
      </div>
      <FinancialDocumentUrlFile
        :model-value="selectedDocUrls.client_invoice ?? ''"
        @update:model-value="setDocUrl('client_invoice', $event)"
        file-label="Client Invoice File"
        :selected-file-name="selectedDocFiles.client_invoice?.name ?? null"
        @file-change="onDocFileChange('client_invoice', $event)"
      />
      <FinancialDocumentExistingList
        :files="docsForCategory('client_invoice')"
        :can-delete="canDeleteDoc"
        :deleting-id="deletingFileId"
          @delete="requestDeleteProjectFile"
      />
      <div class="col-md-3">
        <label class="form-label">Client Tax Invoice (FP)</label>
        <input v-model="form.fpNumberClient" class="form-control" />
      </div>
      <div class="col-md-3">
        <label class="form-label">Client FP Date</label>
        <input v-model="form.fpDateClient" type="date" class="form-control" />
      </div>
      <FinancialDocumentUrlFile
        :model-value="selectedDocUrls.client_tax ?? ''"
        @update:model-value="setDocUrl('client_tax', $event)"
        file-label="Client FP File"
        :selected-file-name="selectedDocFiles.client_tax?.name ?? null"
        @file-change="onDocFileChange('client_tax', $event)"
      />
      <FinancialDocumentExistingList
        :files="docsForCategory('client_tax')"
        :can-delete="canDeleteDoc"
        :deleting-id="deletingFileId"
          @delete="requestDeleteProjectFile"
      />
      <div class="col-md-3">
        <label class="form-label">Balap Number</label>
        <input v-model="form.balapNumber" class="form-control" />
      </div>
      <div class="col-md-3">
        <label class="form-label">Balap Date</label>
        <input v-model="form.balapDate" type="date" class="form-control" />
      </div>
      <FinancialDocumentUrlFile
        :model-value="selectedDocUrls.balap ?? ''"
        @update:model-value="setDocUrl('balap', $event)"
        file-label="Balap File"
        :selected-file-name="selectedDocFiles.balap?.name ?? null"
        @file-change="onDocFileChange('balap', $event)"
      />
      <FinancialDocumentExistingList
        :files="docsForCategory('balap')"
        :can-delete="canDeleteDoc"
        :deleting-id="deletingFileId"
          @delete="requestDeleteProjectFile"
      />
      <div class="col-md-3">
        <label class="form-label">BAST Number</label>
        <input v-model="form.bastNumber" class="form-control" />
      </div>
      <div class="col-md-3">
        <label class="form-label">BAST Date</label>
        <input v-model="form.bastDate" type="date" class="form-control" />
      </div>
      <FinancialDocumentUrlFile
        :model-value="selectedDocUrls.bast ?? ''"
        @update:model-value="setDocUrl('bast', $event)"
        file-label="BAST File"
        :selected-file-name="selectedDocFiles.bast?.name ?? null"
        @file-change="onDocFileChange('bast', $event)"
      />
      <FinancialDocumentExistingList
        :files="docsForCategory('bast')"
        :can-delete="canDeleteDoc"
        :deleting-id="deletingFileId"
          @delete="requestDeleteProjectFile"
      />

      <div class="col-md-4">
        <label class="form-label">Paid Number</label>
        <input v-model="form.paidNumber" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Paid Date</label>
        <input v-model="form.paidDate" type="date" class="form-control" />
        <div class="form-text">
          When saved, syncs with the PAID (Actual) date on Project Progress for this project detail.
        </div>
      </div>

      <div class="col-md-12">
        <label class="form-label">Client</label>
        <select v-model="form.clientId" class="form-select" required>
          <option value="">Select Client</option>
          <option v-for="c in clientsList" :key="c.id" :value="c.id">
            {{ c.name || "—" }}
          </option>
        </select>
      </div>
    </FormSection>

    <FormSection title="Status &amp; Notes">
      <div class="col-md-4">
        <label class="form-label">Document Stage</label>
        <input
          v-model.number="form.stage"
          type="number"
          min="1"
          class="form-control"
        />
        <div class="form-text">
          Use 1 for first issue, 2 for revision, and so on.
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label">Status</label>
        <select v-model="form.status" class="form-select">
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div class="col-md-12">
        <label class="form-label">Note</label>
        <textarea v-model="form.note" class="form-control" rows="2" />
      </div>
    </FormSection>
  </FormShell>

  <AppConfirmDialog
    :visible="showDeleteFileModal"
    title="Delete document"
    :loading="!!deletingFileId"
    confirm-label="Delete"
    confirm-variant="danger"
    focus-target="cancel"
    @cancel="cancelDeleteProjectFile"
    @confirm="removeProjectFile"
  >
    <p class="mb-0">
      {{ projectFileDeleteMessage() }}
    </p>
    <p class="data-meta mt-2 mb-0">
      {{ deleteTargetFile?.fileName || deleteTargetFile?.fileCategory || "-" }}
    </p>
  </AppConfirmDialog>
</template>
