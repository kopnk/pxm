<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useProjectFinancialsApi } from "@/composables/useProjectFinancialsApi";
import {
  useProjectFilesApi,
  type ProjectFileItem,
} from "@/composables/useProjectFilesApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
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

definePageMeta({});

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const id = route.query.id as string | undefined;

const { getProjectFinancialById, updateProjectFinancial } =
  useProjectFinancialsApi();
const { getProjectFiles, uploadProjectFile, deleteProjectFile } =
  useProjectFilesApi();
const { loading, handle } = useFormHandler();

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
const selectedDocFiles = reactive<Record<string, File | null>>({
  partner_po: null,
  partner_invoice: null,
  partner_tax: null,
  balap: null,
  bast: null,
  client_po: null,
  client_invoice: null,
  client_tax: null,
});
const uploadedDocLinks = ref<Record<string, ProjectFileItem>>({});
const deletingCategory = ref<string | null>(null);

const selectedProject = computed(() =>
  projects.value.find((p) => p.id === form.projectId),
);

const selectedDetail = computed(() =>
  details.value.find((d) => d.id === form.projectDetailId),
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
  return new Intl.NumberFormat("en-US", {
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
  const docs = await getProjectFiles({
    refTable: "project_financials",
    refId: id,
    limit: 100,
  });
  const latestByCategory: Record<string, ProjectFileItem> = {};
  for (const item of docs) {
    if (!latestByCategory[item.fileCategory]) {
      latestByCategory[item.fileCategory] = item;
    }
  }
  uploadedDocLinks.value = latestByCategory;
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
  const entries = Object.entries(selectedDocFiles).filter(([, file]) => !!file);
  for (const [fileCategory, file] of entries) {
    await uploadProjectFile({
      refTable: "project_financials",
      refId: id,
      fileCategory,
      file: file as File,
    });
  }
  router.push("/project-financials");
};

const onDocFileChange = (category: string, event: Event) => {
  const input = event.target as HTMLInputElement | null;
  selectedDocFiles[category] = input?.files?.[0] ?? null;
};

const docFileLabel = (category: string) =>
  selectedDocFiles[category]?.name || "Upload file";

const canDeleteDoc = computed(() => auth.user?.role === "superadmin");

const docDownloadLabel = (category: string) => {
  switch (category) {
    case "partner_po":
    case "client_po":
      return "Download PO";
    case "partner_invoice":
    case "client_invoice":
      return "Download Invoice";
    case "partner_tax":
    case "client_tax":
      return "Download FP";
    case "balap":
      return "Download Balap";
    case "bast":
      return "Download BAST";
    default:
      return "Download File";
  }
};

const removeDoc = async (category: string) => {
  if (!canDeleteDoc.value) return;
  const row = uploadedDocLinks.value[category];
  if (!row?.id) return;
  if (!window.confirm("Delete this document permanently?")) return;

  deletingCategory.value = category;
  try {
    await deleteProjectFile(row.id);
    const next = { ...uploadedDocLinks.value };
    delete next[category];
    uploadedDocLinks.value = next;
  } finally {
    deletingCategory.value = null;
  }
};
</script>

<template>
  <div v-if="pageLoading" class="container py-4 text-muted">Loading…</div>
  <FormShell
    v-else
    title="Update Project Financial"
    :loading="loading"
    @submit="
      () => handle(handleSubmit, toastSuccessUpdated('projectFinancial'))
    "
    @cancel="() => router.push('/project-financials')"
  >
    <FormSection title="Project &amp; Detail">
      <div class="col-md-6">
        <label class="form-label">Project</label>
        <select v-model="form.projectId" class="form-select" required>
          <option value="">Select Project</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">
            {{ p.projectName }} — {{ p.poNumber }}
          </option>
        </select>
      </div>
      <div class="col-md-6">
        <label class="form-label">Project Detail</label>
        <select
          v-model="form.projectDetailId"
          class="form-select"
          required
          :disabled="!form.projectId"
        >
          <option value="">Select Project Detail</option>
          <option v-for="d in details" :key="d.id" :value="d.id">
            {{ formatProjectDetailSelectLabel(d) }}
          </option>
        </select>
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

    <FormSection title="Flow &amp; Document">
      <div class="col-md-3">
        <label class="form-label">Flow</label>
        <select v-model="form.flowDirection" class="form-select" disabled>
          <option value="in">In (Partner Side)</option>
          <option value="out">Out (Client Side)</option>
        </select>
        <div class="form-text">
          Flow is locked on update to keep In/Out lines separated.
        </div>
      </div>
      <div class="col-md-3">
        <label class="form-label">Doc Type</label>
        <select v-model="form.docType" class="form-select">
          <option value="invoice">Invoice</option>
          <option value="payment">Payment</option>
          <option value="po">PO</option>
          <option value="pr">PR</option>
          <option value="tax">Tax</option>
          <option value="vb">VB</option>
          <option value="mcm">MCM</option>
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label">Doc Number</label>
        <input v-model="form.docNumber" class="form-control" />
      </div>
      <div class="col-md-3">
        <label class="form-label">Doc Date</label>
        <input v-model="form.docDate" type="date" class="form-control" />
      </div>
    </FormSection>

    <FormSection v-if="isInFlow" title="Partner Details">
      <div class="col-md-3">
        <label class="form-label">Partner Qty</label>
        <input
          v-model.number="form.qtyPartner"
          type="number"
          step="0.0001"
          class="form-control"
        />
      </div>
      <div class="col-md-3">
        <label class="form-label">Partner Unit Price</label>
        <input
          v-model.number="form.unitPricePartner"
          type="number"
          step="0.01"
          class="form-control"
        />
      </div>
      <div class="col-md-3">
        <label class="form-label">PPH (%)</label>
        <input
          v-model.number="form.pphPercent"
          type="number"
          step="0.0001"
          min="0"
          class="form-control"
        />
      </div>
      <div class="col-md-3">
        <label class="form-label">Tax In (%)</label>
        <input
          v-model.number="form.taxInPercent"
          type="number"
          step="0.0001"
          min="0"
          class="form-control"
        />
      </div>
      <div class="col-12">
        <div class="alert alert-secondary py-2 mb-0 small">
          <div>
            <span class="fw-bold">Total (preview):</span>
            {{ fmtMoney(partnerTotalPreview) }}
          </div>
          <div class="data-meta mt-1 mb-0">
            PPH and tax in are entered as a percentage of the partner line (qty
            × unit). IDR amounts are calculated when you save.
          </div>
        </div>
      </div>

      <div class="col-md-4">
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
      <div class="col-md-4">
        <label class="form-label">Partner PO Date</label>
        <input v-model="form.poDatePartner" type="date" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Partner PO File</label>
        <input
          class="form-control"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="onDocFileChange('partner_po', $event)"
        />
        <div class="data-meta mt-1 d-flex align-items-center gap-2">
          <a
            v-if="uploadedDocLinks.partner_po?.fileUrl"
            :href="uploadedDocLinks.partner_po.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ docDownloadLabel("partner_po") }}
          </a>
          <span v-else>{{ docFileLabel("partner_po") }}</span>
          <button
            v-if="canDeleteDoc && uploadedDocLinks.partner_po?.id"
            type="button"
            class="btn btn-sm btn-outline-danger px-2 py-0"
            :disabled="deletingCategory === 'partner_po'"
            @click="removeDoc('partner_po')"
          >
            {{ deletingCategory === "partner_po" ? "..." : "🗑" }}
          </button>
        </div>
      </div>
      <div class="col-md-4">
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
      <div class="col-md-4">
        <label class="form-label">Partner Invoice Date</label>
        <input
          v-model="form.invoiceDatePartner"
          type="date"
          class="form-control"
        />
      </div>
      <div class="col-md-4">
        <label class="form-label">Partner Invoice File</label>
        <input
          class="form-control"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="onDocFileChange('partner_invoice', $event)"
        />
        <div class="data-meta mt-1 d-flex align-items-center gap-2">
          <a
            v-if="uploadedDocLinks.partner_invoice?.fileUrl"
            :href="uploadedDocLinks.partner_invoice.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ docDownloadLabel("partner_invoice") }}
          </a>
          <span v-else>{{ docFileLabel("partner_invoice") }}</span>
          <button
            v-if="canDeleteDoc && uploadedDocLinks.partner_invoice?.id"
            type="button"
            class="btn btn-sm btn-outline-danger px-2 py-0"
            :disabled="deletingCategory === 'partner_invoice'"
            @click="removeDoc('partner_invoice')"
          >
            {{ deletingCategory === "partner_invoice" ? "..." : "🗑" }}
          </button>
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label">Partner Tax Invoice (FP)</label>
        <input v-model="form.fpNumberPartner" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Partner FP Date</label>
        <input v-model="form.fpDatePartner" type="date" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Partner FP File</label>
        <input
          class="form-control"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="onDocFileChange('partner_tax', $event)"
        />
        <div class="data-meta mt-1 d-flex align-items-center gap-2">
          <a
            v-if="uploadedDocLinks.partner_tax?.fileUrl"
            :href="uploadedDocLinks.partner_tax.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ docDownloadLabel("partner_tax") }}
          </a>
          <span v-else>{{ docFileLabel("partner_tax") }}</span>
          <button
            v-if="canDeleteDoc && uploadedDocLinks.partner_tax?.id"
            type="button"
            class="btn btn-sm btn-outline-danger px-2 py-0"
            :disabled="deletingCategory === 'partner_tax'"
            @click="removeDoc('partner_tax')"
          >
            {{ deletingCategory === "partner_tax" ? "..." : "🗑" }}
          </button>
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label">Balap Number</label>
        <input v-model="form.balapNumber" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Balap Date</label>
        <input v-model="form.balapDate" type="date" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Balap File</label>
        <input
          class="form-control"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="onDocFileChange('balap', $event)"
        />
        <div class="data-meta mt-1 d-flex align-items-center gap-2">
          <a
            v-if="uploadedDocLinks.balap?.fileUrl"
            :href="uploadedDocLinks.balap.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ docDownloadLabel("balap") }}
          </a>
          <span v-else>{{ docFileLabel("balap") }}</span>
          <button
            v-if="canDeleteDoc && uploadedDocLinks.balap?.id"
            type="button"
            class="btn btn-sm btn-outline-danger px-2 py-0"
            :disabled="deletingCategory === 'balap'"
            @click="removeDoc('balap')"
          >
            {{ deletingCategory === "balap" ? "..." : "🗑" }}
          </button>
        </div>
      </div>
      <div class="col-md-4">
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
      <div class="col-md-4">
        <label class="form-label">BAST Date</label>
        <input v-model="form.bastDate" type="date" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">BAST File</label>
        <input
          class="form-control"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="onDocFileChange('bast', $event)"
        />
        <div class="data-meta mt-1 d-flex align-items-center gap-2">
          <a
            v-if="uploadedDocLinks.bast?.fileUrl"
            :href="uploadedDocLinks.bast.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ docDownloadLabel("bast") }}
          </a>
          <span v-else>{{ docFileLabel("bast") }}</span>
          <button
            v-if="canDeleteDoc && uploadedDocLinks.bast?.id"
            type="button"
            class="btn btn-sm btn-outline-danger px-2 py-0"
            :disabled="deletingCategory === 'bast'"
            @click="removeDoc('bast')"
          >
            {{ deletingCategory === "bast" ? "..." : "🗑" }}
          </button>
        </div>
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
        <input
          v-model.number="form.qtyClient"
          type="number"
          step="0.0001"
          class="form-control"
        />
      </div>
      <div class="col-md-4">
        <label class="form-label">Client Unit Price</label>
        <input
          v-model.number="form.unitPriceClient"
          type="number"
          step="0.01"
          class="form-control"
        />
      </div>
      <div class="col-md-4">
        <label class="form-label">Tax Out (%)</label>
        <input
          v-model.number="form.taxOutPercent"
          type="number"
          step="0.0001"
          min="0"
          class="form-control"
        />
      </div>
      <div class="col-12">
        <div class="alert alert-secondary py-2 mb-0 small">
          <div>
            <span class="fw-bold">Total (preview):</span>
            {{ fmtMoney(clientTotalPreview) }}
          </div>
          <div class="data-meta mt-1 mb-0">
            Tax out is entered as a percentage of the client line (qty × unit).
            IDR amount is calculated when you save.
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <label class="form-label">Client PO</label>
        <input v-model="form.poNumberClient" class="form-control" disabled />
      </div>
      <div class="col-md-4">
        <label class="form-label">Client PO Date</label>
        <input
          v-model="form.poDateClient"
          type="date"
          class="form-control"
          disabled
        />
      </div>
      <div class="col-md-4">
        <label class="form-label">Client PO File</label>
        <input
          class="form-control"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="onDocFileChange('client_po', $event)"
        />
        <div class="data-meta mt-1">
          <a
            v-if="uploadedDocLinks.client_po?.fileUrl"
            :href="uploadedDocLinks.client_po.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ docDownloadLabel("client_po") }}
          </a>
          <span v-else>{{ docFileLabel("client_po") }}</span>
          <button
            v-if="canDeleteDoc && uploadedDocLinks.client_po?.id"
            type="button"
            class="btn btn-sm btn-outline-danger px-2 py-0 ms-2"
            :disabled="deletingCategory === 'client_po'"
            @click="removeDoc('client_po')"
          >
            {{ deletingCategory === "client_po" ? "..." : "🗑" }}
          </button>
        </div>
      </div>
      <div class="col-md-4">
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
      <div class="col-md-4">
        <label class="form-label">Client Invoice Date</label>
        <input
          v-model="form.invoiceDateClient"
          type="date"
          class="form-control"
        />
      </div>
      <div class="col-md-4">
        <label class="form-label">Client Invoice File</label>
        <input
          class="form-control"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="onDocFileChange('client_invoice', $event)"
        />
        <div class="data-meta mt-1">
          <a
            v-if="uploadedDocLinks.client_invoice?.fileUrl"
            :href="uploadedDocLinks.client_invoice.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ docDownloadLabel("client_invoice") }}
          </a>
          <span v-else>{{ docFileLabel("client_invoice") }}</span>
          <button
            v-if="canDeleteDoc && uploadedDocLinks.client_invoice?.id"
            type="button"
            class="btn btn-sm btn-outline-danger px-2 py-0 ms-2"
            :disabled="deletingCategory === 'client_invoice'"
            @click="removeDoc('client_invoice')"
          >
            {{ deletingCategory === "client_invoice" ? "..." : "🗑" }}
          </button>
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label">Client Tax Invoice (FP)</label>
        <input v-model="form.fpNumberClient" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Client FP Date</label>
        <input v-model="form.fpDateClient" type="date" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Client FP File</label>
        <input
          class="form-control"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="onDocFileChange('client_tax', $event)"
        />
        <div class="data-meta mt-1">
          <a
            v-if="uploadedDocLinks.client_tax?.fileUrl"
            :href="uploadedDocLinks.client_tax.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ docDownloadLabel("client_tax") }}
          </a>
          <span v-else>{{ docFileLabel("client_tax") }}</span>
          <button
            v-if="canDeleteDoc && uploadedDocLinks.client_tax?.id"
            type="button"
            class="btn btn-sm btn-outline-danger px-2 py-0 ms-2"
            :disabled="deletingCategory === 'client_tax'"
            @click="removeDoc('client_tax')"
          >
            {{ deletingCategory === "client_tax" ? "..." : "🗑" }}
          </button>
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label">Balap Number</label>
        <input v-model="form.balapNumber" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Balap Date</label>
        <input v-model="form.balapDate" type="date" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Balap File</label>
        <input
          class="form-control"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="onDocFileChange('balap', $event)"
        />
        <div class="data-meta mt-1">
          <a
            v-if="uploadedDocLinks.balap?.fileUrl"
            :href="uploadedDocLinks.balap.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ docDownloadLabel("balap") }}
          </a>
          <span v-else>{{ docFileLabel("balap") }}</span>
          <button
            v-if="canDeleteDoc && uploadedDocLinks.balap?.id"
            type="button"
            class="btn btn-sm btn-outline-danger px-2 py-0 ms-2"
            :disabled="deletingCategory === 'balap'"
            @click="removeDoc('balap')"
          >
            {{ deletingCategory === "balap" ? "..." : "🗑" }}
          </button>
        </div>
      </div>
      <div class="col-md-4">
        <label class="form-label">BAST Number</label>
        <input v-model="form.bastNumber" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">BAST Date</label>
        <input v-model="form.bastDate" type="date" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">BAST File</label>
        <input
          class="form-control"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="onDocFileChange('bast', $event)"
        />
        <div class="data-meta mt-1">
          <a
            v-if="uploadedDocLinks.bast?.fileUrl"
            :href="uploadedDocLinks.bast.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ docDownloadLabel("bast") }}
          </a>
          <span v-else>{{ docFileLabel("bast") }}</span>
          <button
            v-if="canDeleteDoc && uploadedDocLinks.bast?.id"
            type="button"
            class="btn btn-sm btn-outline-danger px-2 py-0 ms-2"
            :disabled="deletingCategory === 'bast'"
            @click="removeDoc('bast')"
          >
            {{ deletingCategory === "bast" ? "..." : "🗑" }}
          </button>
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
</template>
