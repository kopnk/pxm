<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useProjectFinancialsApi } from "@/composables/useProjectFinancialsApi";
import { useProjectFilesApi } from "@/composables/useProjectFilesApi";
import {
  financialDocCategories,
  saveFinancialDocuments,
} from "@/composables/useProjectFinancialDocuments";
import { useRefDocumentFields } from "@/composables/useProjectRefDocuments";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessCreated } from "@/composables/useToastMessages";
import { useNotify } from "@/composables/useNotify";
import { apiFetch } from "~/utils/apiFetch";
import {
  emptyProjectFinancialForm,
  buildProjectFinancialPayload,
  pfPartnerLineBase,
  pfClientLineBase,
  pfAmountFromPercent,
  pfPercentFromAmount,
} from "@/composables/useProjectFinancialForm";
import { formatProjectDetailSelectLabel } from "~/utils/formatProjectDetailSelectLabel";
import DecimalInput from "@/components/form/DecimalInput.vue";
import FinancialDocumentUrlFile from "@/components/form/FinancialDocumentUrlFile.vue";
import { toProjectSelectOptions } from "~/utils/projectSelectOptions";
import {
  paidPartnerDateLabel,
  paidPartnerIdLabel,
} from "~/lib/projectFinancialLabels";

definePageMeta({});

const router = useRouter();
const { createProjectFinancial } = useProjectFinancialsApi();
const { uploadProjectFile, createProjectFileByUrl } = useProjectFilesApi();
const { loading, handle } = useFormHandler();
const notify = useNotify();

const projects = ref<{ id: string; projectName?: string; poNumber?: string }[]>(
  [],
);
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
/** Nilai tax_out dari project detail (rupiah); diset ke % client line saat qty×unit ada */
const detailTaxOutAmountSeed = ref<number | null>(null);

const form = reactive(emptyProjectFinancialForm());
const selectedFlow = ref<"" | "in" | "out">("");
const {
  files: selectedDocFiles,
  urls: selectedDocUrls,
  syncSlots: syncDocSlots,
  setUrl: setDocUrl,
  setFileFromEvent: onDocFileChange,
  hasPending: hasPendingDocuments,
} = useRefDocumentFields(financialDocCategories);
syncDocSlots();

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
const isInFlow = computed(() => selectedFlow.value === "in");
const isOutFlow = computed(() => selectedFlow.value === "out");

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

function syncTaxOutPercentFromDetailSeed() {
  const bc = pfClientLineBase(form.qtyClient, form.unitPriceClient);
  const seed = detailTaxOutAmountSeed.value;
  if (seed != null && bc != null && bc > 0) {
    const pct = pfPercentFromAmount(seed, bc);
    if (pct != null) form.taxOutPercent = pct;
  }
}

const fmtMoney = (v: number | null) => {
  if (v === null) return "—";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v);
};

const n = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const numberValue = Number(v);
  return Number.isFinite(numberValue) ? numberValue : null;
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

watch(
  () => form.projectId,
  async (pid) => {
    form.projectDetailId = "";
    detailTaxOutAmountSeed.value = null;
    form.taxOutPercent = null;
    await loadDetails(pid);
    if (!pid) return;

    try {
      const res = await apiFetch<{ data: Record<string, unknown> }>(
        `/api/projects/${pid}`,
      );
      const p = res.data;
      form.clientId = p.clientId ? String(p.clientId) : "";
      form.partnerId = "";
      form.pphPercent = null;
      form.taxInPercent = null;
    } catch {
      /* ignore */
    }
  },
);

watch(
  () => form.projectDetailId,
  async (did) => {
    if (!did) {
      detailTaxOutAmountSeed.value = null;
      form.taxOutPercent = null;
      return;
    }
    try {
      const res = await apiFetch<{ data: Record<string, unknown> }>(
        `/api/project_details/${did}`,
      );
      const d = res.data;
      detailTaxOutAmountSeed.value = n(d.taxOut);
      syncTaxOutPercentFromDetailSeed();
    } catch {
      detailTaxOutAmountSeed.value = null;
    }
  },
);

watch(
  () => [form.qtyClient, form.unitPriceClient, detailTaxOutAmountSeed.value],
  () => {
    syncTaxOutPercentFromDetailSeed();
  },
);

watch(selectedFlow, (flow) => {
  if (flow === "") {
    form.taxOutPercent = null;
    form.taxInPercent = null;
    form.pphPercent = null;
    return;
  }

  form.flowDirection = flow;
  if (flow === "in") {
    form.taxOutPercent = null;
  } else {
    form.taxInPercent = null;
    form.pphPercent = null;
  }
});

onMounted(async () => {
  await Promise.all([loadProjects(), loadClientsList(), loadPartnersList()]);
});

const handleSubmit = async () => {
  if (!form.projectId) throw new Error("Project is required");
  if (!form.projectDetailId) throw new Error("Project detail is required");
  if (!selectedFlow.value) throw new Error("Flow is required");
  if (form.stage != null && form.stage < 1) throw new Error("Stage must be at least 1");
  if (isInFlow.value && !form.partnerId.trim()) throw new Error("Partner is required");
  if (isOutFlow.value && !form.clientId.trim()) throw new Error("Client is required");

  const created: any = await createProjectFinancial(buildProjectFinancialPayload(form));
  const createdId = created?.data?.id as string | undefined;
  if (createdId && hasPendingDocuments()) {
    try {
      await saveFinancialDocuments(
        { uploadProjectFile, createProjectFileByUrl },
        createdId,
        selectedDocFiles,
        selectedDocUrls,
      );
    } catch (err: any) {
      notify.warning(
        err?.data?.message ||
          err?.message ||
          "Project financial created, but document save failed",
      );
    }
  }
  await router.push("/project-financials");
};
</script>

<template>
  <FormShell
    title="Create Project Financial"
    :loading="loading"
    @submit="() => handle(handleSubmit, toastSuccessCreated('projectFinancial'))"
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
        <select v-model="selectedFlow" class="form-select" required>
          <option value="">Select Flow</option>
          <option value="in">In (Partner Side)</option>
          <option value="out">Out (Client Side)</option>
        </select>
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
            PPH and tax in are entered as a percentage of the partner line
            (qty x unit). IDR amounts are calculated when you save.
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <label class="form-label">Partner PO</label>
        <input v-model="form.poNumberPartner" class="form-control" />
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
      <div class="col-md-3">
        <label class="form-label">Partner Invoice</label>
        <input v-model="form.invoiceNumberPartner" class="form-control" />
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

      <div class="col-md-4">
        <label class="form-label">VB Number</label>
        <input v-model="form.vbNumber" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">VB Date</label>
        <input v-model="form.vbDate" type="date" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">{{ paidPartnerIdLabel }}</label>
        <input v-model="form.mcmNumber" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">{{ paidPartnerDateLabel }}</label>
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
        <input v-model="form.poNumberClient" class="form-control" />
      </div>
      <div class="col-md-3">
        <label class="form-label">Client PO Date</label>
        <input v-model="form.poDateClient" type="date" class="form-control" />
      </div>
      <FinancialDocumentUrlFile
        :model-value="selectedDocUrls.client_po ?? ''"
        @update:model-value="setDocUrl('client_po', $event)"
        file-label="Client PO File"
        :selected-file-name="selectedDocFiles.client_po?.name ?? null"
        @file-change="onDocFileChange('client_po', $event)"
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
            Print Client Invoice
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
        <input v-model.number="form.stage" type="number" min="1" class="form-control" />
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
