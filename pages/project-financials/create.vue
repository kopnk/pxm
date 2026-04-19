<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useProjectFinancialsApi } from "@/composables/useProjectFinancialsApi";
import { useProjectFilesApi } from "@/composables/useProjectFilesApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessCreated } from "@/composables/useToastMessages";
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

definePageMeta({});

const router = useRouter();
const { createProjectFinancial } = useProjectFinancialsApi();
const { uploadProjectFile } = useProjectFilesApi();
const { loading, handle } = useFormHandler();

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

const selectedProject = computed(() =>
  projects.value.find((p) => p.id === form.projectId),
);

const selectedDetail = computed(() =>
  details.value.find((d) => d.id === form.projectDetailId),
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
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v);
};

const n = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
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
  if (createdId) {
    const entries = Object.entries(selectedDocFiles).filter(([, file]) => !!file);
    for (const [fileCategory, file] of entries) {
      await uploadProjectFile({
        refTable: "project_financials",
        refId: createdId,
        fileCategory,
        file: file as File,
      });
    }
  }
  router.push("/project-financials");
};

const onDocFileChange = (category: string, event: Event) => {
  const input = event.target as HTMLInputElement | null;
  selectedDocFiles[category] = input?.files?.[0] ?? null;
};

const docFileLabel = (category: string) =>
  selectedDocFiles[category]?.name || "Upload file";
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
        <select v-model="selectedFlow" class="form-select" required>
          <option value="">Select Flow</option>
          <option value="in">In (Partner Side)</option>
          <option value="out">Out (Client Side)</option>
        </select>
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
            PPH and tax in are entered as a percentage of the partner line
            (qty × unit). IDR amounts are calculated when you save.
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <label class="form-label">Partner PO</label>
        <input v-model="form.poNumberPartner" class="form-control" />
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
        <div class="data-meta mt-1">{{ docFileLabel("partner_po") }}</div>
      </div>
      <div class="col-md-4">
        <label class="form-label">Partner Invoice</label>
        <input v-model="form.invoiceNumberPartner" class="form-control" />
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
        <div class="data-meta mt-1">{{ docFileLabel("partner_invoice") }}</div>
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
        <div class="data-meta mt-1">{{ docFileLabel("partner_tax") }}</div>
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
        <div class="data-meta mt-1">{{ docFileLabel("balap") }}</div>
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
        <div class="data-meta mt-1">{{ docFileLabel("bast") }}</div>
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
        <input v-model="form.poNumberClient" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Client PO Date</label>
        <input v-model="form.poDateClient" type="date" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Client PO File</label>
        <input
          class="form-control"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="onDocFileChange('client_po', $event)"
        />
        <div class="data-meta mt-1">{{ docFileLabel("client_po") }}</div>
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
            Print Client Invoice
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
        <div class="data-meta mt-1">{{ docFileLabel("client_invoice") }}</div>
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
        <div class="data-meta mt-1">{{ docFileLabel("client_tax") }}</div>
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
        <div class="data-meta mt-1">{{ docFileLabel("balap") }}</div>
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
        <div class="data-meta mt-1">{{ docFileLabel("bast") }}</div>
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
