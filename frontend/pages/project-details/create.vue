<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useProjectDetailsApi } from "@/composables/useProjectDetailsApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessCreated } from "@/composables/useToastMessages";
import { useProjectDetailForm } from "@/composables/useProjectDetailForm";
import { useNotify } from "@/composables/useNotify";
import { useAuthStore } from "@/stores/auth";
import DecimalInput from "@/components/form/DecimalInput.vue";
import { apiFetch } from "~/utils/apiFetch";
import { toProjectSelectOptions } from "~/utils/projectSelectOptions";

/* ================= ROUTER ================= */
const router = useRouter();
const { createProjectDetail, createProjectDetailsBulk } = useProjectDetailsApi();
const { loading, handle } = useFormHandler();
const notify = useNotify();
const authStore = useAuthStore();
const fileInputRef = ref<HTMLInputElement | null>(null);
const bulkLoading = ref(false);
const loadXlsx = () => import("xlsx");

const BULK_TEMPLATE_HEADERS = [
  "projectId",
  "cityKabId",
  "lineNumber",
  "systemkey",
  "neId",
  "materialId",
  "materialName",
  "siteId",
  "siteName",
  "picArea",
  "quantity",
  "uom",
  "unitPrice",
  "status",
  "remarksProjectsDetails",
  "remarksDelay",
  "remarksCancel",
  "taxOut",
] as const;
const PROJECT_DETAIL_STATUSES = ["active", "delay", "closed", "cancelled"] as const;

type BulkTemplateHeader = (typeof BULK_TEMPLATE_HEADERS)[number];
const {
  form,
  projects,
  regions,
  subRegions,
  cities,
  selectedRegion,
  selectedSubRegion,
  loading: optionsLoading,
  error,
  statusOptions,
  isValid,
  requiredFieldMessage,
  formatNumber,
  totalPriceDisplay,
  loadProjects,
  loadRegions,
  buildPayload,
} = useProjectDetailForm();

const formLoading = computed(() => loading.value || optionsLoading.value);
const projectSelectOptions = computed(() => toProjectSelectOptions(projects.value));
const canBulkUpload = computed(
  () => authStore.user?.role?.toLowerCase() === "superadmin",
);

const normalizeText = (value: unknown): string | null => {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
};

const normalizeRequiredText = (value: unknown): string => {
  return String(value ?? "").trim();
};

const normalizeNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const text = String(value).trim().replace(/\s/g, "");
  if (!text) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  let normalized = text;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = text.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    normalized = text.replace(/\./g, "");
  }

  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

const normalizeInteger = (value: unknown): number | null => {
  const num = normalizeNumber(value);
  if (num == null) return null;
  return Number.isInteger(num) ? num : null;
};

const isEmptyCell = (value: unknown) => value == null || value === "";

const isOptionalIntegerCellValid = (value: unknown) => {
  if (isEmptyCell(value)) return true;
  const num = normalizeNumber(value);
  return num != null && Number.isInteger(num);
};

const normalizeStatus = (value: unknown) => {
  const text = normalizeRequiredText(value).toLowerCase();
  return text || "active";
};

const hasRequiredBulkFields = (row: Record<string, unknown>) => {
  return (
    normalizeRequiredText(row.projectId).length > 0 &&
    normalizeRequiredText(row.cityKabId).length > 0 &&
    normalizeRequiredText(row.siteName).length > 0 &&
    normalizeNumber(row.quantity) != null &&
    normalizeNumber(row.unitPrice) != null &&
    normalizeRequiredText(row.systemkey).length > 0
  );
};

const downloadBulkTemplate = async () => {
  if (!canBulkUpload.value) {
    notify.warning("Only superadmin can use bulk upload");
    return;
  }

  try {
    const XLSX = await loadXlsx();
    const [projectResponse, cityResponse, subRegionResponse, regionResponse] =
      await Promise.all([
      apiFetch<any>("/api/projects", {
        query: {
          page: 1,
          limit: 1000,
        },
      }),
      apiFetch<any>("/api/regions", {
        query: {
          type: "city_kab",
          page: 1,
          limit: 1000,
        },
      }),
      apiFetch<any>("/api/regions", {
        query: {
          type: "sub_region",
          page: 1,
          limit: 1000,
        },
      }),
      apiFetch<any>("/api/regions", {
        query: {
          type: "region",
          page: 1,
          limit: 1000,
        },
      }),
    ]);

    const projectItems = Array.isArray(projectResponse?.data?.items)
      ? projectResponse.data.items
      : [];
    const cityItems = Array.isArray(cityResponse?.data?.items)
      ? cityResponse.data.items
      : [];
    const subRegionItems = Array.isArray(subRegionResponse?.data?.items)
      ? subRegionResponse.data.items
      : [];
    const regionItems = Array.isArray(regionResponse?.data?.items)
      ? regionResponse.data.items
      : [];

    const sampleProjectId = projectItems[0]?.id || "uuid-project";
    const sampleCityKabId = cityItems[0]?.id || "uuid-city-kab";

    const sampleRow: Record<BulkTemplateHeader, string | number> = {
      projectId: sampleProjectId,
      cityKabId: sampleCityKabId,
      lineNumber: 1,
      systemkey: "SYS-001",
      neId: "NE-001",
      materialId: "",
      materialName: "",
      siteId: "",
      siteName: "",
      picArea: "",
      quantity: 1,
      uom: "",
      unitPrice: 1000,
      status: "active",
      remarksProjectsDetails: "",
      remarksDelay: "",
      remarksCancel: "",
      taxOut: 11,
    };

    const worksheet = XLSX.utils.json_to_sheet([sampleRow], {
      header: [...BULK_TEMPLATE_HEADERS],
    });

    const subRegionById = new Map<string, any>(
      subRegionItems.map((item: any) => [item.id, item]),
    );
    const regionById = new Map<string, any>(regionItems.map((item: any) => [item.id, item]));

    const cityReferenceRows = cityItems
      .map((item: any) => {
        const subRegion = subRegionById.get(item.parentId);
        const region = subRegion ? regionById.get(subRegion.parentId) : null;
        return {
          regionName: region?.name ?? "",
          subRegionName: subRegion?.name ?? "",
          cityKabName: item.name ?? "",
          cityKabId: item.id ?? "",
        };
      })
      .sort(
        (
          a: { regionName: string; subRegionName: string; cityKabName: string },
          b: { regionName: string; subRegionName: string; cityKabName: string },
        ) =>
          a.regionName.localeCompare(b.regionName, "id") ||
          a.subRegionName.localeCompare(b.subRegionName, "id") ||
          a.cityKabName.localeCompare(b.cityKabName, "id"),
      );

    const cityReferenceSheet = XLSX.utils.json_to_sheet(cityReferenceRows, {
      header: ["regionName", "subRegionName", "cityKabName", "cityKabId"],
    });

    const projectReferenceRows = projectItems
      .map((item: any) => ({
        projectName: item.projectName ?? "",
        poNumber: item.poNumber ?? "",
        status: item.status ?? "",
        projectId: item.id ?? "",
      }))
      .sort(
        (
          a: { projectName: string; poNumber: string },
          b: { projectName: string; poNumber: string },
        ) =>
          a.projectName.localeCompare(b.projectName, "id") ||
          a.poNumber.localeCompare(b.poNumber, "id"),
      );

    const projectReferenceSheet = XLSX.utils.json_to_sheet(projectReferenceRows, {
      header: ["projectName", "poNumber", "status", "projectId"],
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "project_details");
    XLSX.utils.book_append_sheet(workbook, projectReferenceSheet, "project_reference");
    XLSX.utils.book_append_sheet(workbook, cityReferenceSheet, "city_kab_reference");
    XLSX.writeFile(workbook, "project-details-bulk-template.xlsx");
  } catch (err: any) {
    notify.error(
      err?.data?.message || err?.message || "Failed to download bulk template",
    );
  }
};

const openBulkFilePicker = () => {
  if (!canBulkUpload.value) {
    notify.warning("Only superadmin can use bulk upload");
    return;
  }

  fileInputRef.value?.click();
};

const handleBulkFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = "";

  if (!file) return;

  if (!canBulkUpload.value) {
    notify.warning("Only superadmin can use bulk upload");
    return;
  }

  try {
    bulkLoading.value = true;
    const XLSX = await loadXlsx();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      notify.error("Template sheet not found");
      return;
    }
    const sheet = workbook.Sheets[firstSheet];

    if (!sheet) {
      notify.error("Template sheet not found");
      return;
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (!rows.length) {
      notify.warning("Excel file is empty");
      return;
    }

    const invalidRowIndex = rows.findIndex((row) => !hasRequiredBulkFields(row));
    if (invalidRowIndex !== -1) {
      notify.warning(
        `Row ${invalidRowIndex + 2} wajib isi: projectId, cityKabId, siteName, quantity, unitPrice, systemkey`,
      );
      return;
    }

    const invalidLineNumberIndex = rows.findIndex(
      (row) => !isOptionalIntegerCellValid(row.lineNumber),
    );
    if (invalidLineNumberIndex !== -1) {
      notify.warning(`Row ${invalidLineNumberIndex + 2} lineNumber harus angka bulat`);
      return;
    }

    const invalidStatusIndex = rows.findIndex((row) => {
      const status = normalizeStatus(row.status);
      return !PROJECT_DETAIL_STATUSES.includes(status as any);
    });
    if (invalidStatusIndex !== -1) {
      notify.warning(
        `Row ${invalidStatusIndex + 2} status harus: active, delay, closed, atau cancelled`,
      );
      return;
    }

    const payload = rows.map((row) => ({
      projectId: normalizeRequiredText(row.projectId),
      cityKabId: normalizeRequiredText(row.cityKabId),
      lineNumber: normalizeInteger(row.lineNumber),
      systemkey: normalizeRequiredText(row.systemkey),
      neId: normalizeText(row.neId),
      materialId: normalizeText(row.materialId),
      materialName: normalizeText(row.materialName),
      siteId: normalizeText(row.siteId),
      siteName: normalizeText(row.siteName),
      picArea: normalizeText(row.picArea),
      quantity: normalizeNumber(row.quantity),
      uom: normalizeText(row.uom),
      unitPrice: normalizeNumber(row.unitPrice),
      status: normalizeStatus(row.status),
      remarksProjectsDetails: normalizeText(row.remarksProjectsDetails),
      remarksDelay: normalizeText(row.remarksDelay),
      remarksCancel: normalizeText(row.remarksCancel),
      taxOut: normalizeNumber(row.taxOut),
    }));

    await createProjectDetailsBulk(payload);
    notify.success(`Success! Project detail bulk created (${payload.length} row).`);
    await router.push("/project-details");
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || "Bulk upload failed");
  } finally {
    bulkLoading.value = false;
  }
};

/* ================= SUBMIT ================= */

const handleSubmit = async () => {
  if (!isValid.value) {
    notify.warning(requiredFieldMessage.value);
    return;
  }

  await handle(async () => {
    await createProjectDetail(buildPayload());
    await router.push("/project-details");
  }, toastSuccessCreated("projectDetail"));
};

onMounted(async () => {
  try {
    await Promise.all([loadProjects(), loadRegions()]);
  } catch {
    notify.error(error.value || "Failed to load form data");
  }
});
</script>

<template>
  <FormShell
    title="Create Project Detail"
    :loading="formLoading"
    @submit="handleSubmit"
    @cancel="() => router.push('/project-details')"
  >
    <template #header-actions>
      <div v-if="canBulkUpload" class="d-flex gap-2 align-items-center">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :disabled="bulkLoading"
          @click="downloadBulkTemplate"
        >
          Download
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :disabled="bulkLoading"
          @click="openBulkFilePicker"
        >
          {{ bulkLoading ? "Uploading..." : "Upload" }}
        </button>
        <input
          ref="fileInputRef"
          type="file"
          class="d-none"
          accept=".xlsx,.xls"
          @change="handleBulkFileChange"
        />
      </div>
    </template>

    <!-- ================= PROJECT ================= -->
    <FormSection>
      <div class="col-md-12">
        <label class="form-label">Project</label>
        <FormScrollableSelect
          v-model="form.projectId"
          :options="projectSelectOptions"
          placeholder="-- Select Project --"
          name="projectId"
          required
        />
      </div>
    </FormSection>

    <!-- ================= REGION ================= -->
    <FormSection>
      <div class="col-md-4">
        <label class="form-label">Region</label>
        <select v-model="selectedRegion" class="form-select">
          <option value="">-- Select Region --</option>
          <option v-for="r in regions" :key="r.id" :value="r.id">
            {{ r.name }}
          </option>
        </select>
      </div>

      <div class="col-md-4">
        <label class="form-label">Sub Region</label>
        <select
          v-model="selectedSubRegion"
          class="form-select"
          :disabled="!selectedRegion"
        >
          <option value="">-- Select Sub Region --</option>
          <option v-for="s in subRegions" :key="s.id" :value="s.id">
            {{ s.name }}
          </option>
        </select>
      </div>

      <div class="col-md-4">
        <label class="form-label">City / Kab</label>
        <select
          v-model="form.cityKabId"
          class="form-select"
          :disabled="!selectedSubRegion"
          required
        >
          <option value="">-- Select City/Kab --</option>
          <option v-for="c in cities" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>
    </FormSection>

    <!-- ================= SYSTEM ================= -->
    <!-- ================= SYSTEM ================= -->
    <FormSection>
      <div class="col-md-4">
        <label class="form-label">Line Number</label>
        <input
          type="number"
          v-model.number="form.lineNumber"
          class="form-control"
        />
      </div>
      <div class="col-md-4">
        <label class="form-label">NE ID</label>
        <input v-model="form.neId" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label">System Key</label>
        <input v-model="form.systemkey" class="form-control" required />
      </div>
    </FormSection>

    <!-- ================= MATERIAL ================= -->
    <FormSection>
      <div class="col-md-4">
        <label class="form-label">Material ID</label>
        <input v-model="form.materialId" class="form-control" />
      </div>

      <div class="col-md-4">
        <label class="form-label">Material Name</label>
        <input v-model="form.materialName" class="form-control" />
      </div>
    </FormSection>

    <!-- ================= SITE ================= -->
    <FormSection>
      <div class="col-md-6">
        <label class="form-label">Site ID</label>
        <input v-model="form.siteId" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="form-label">Site Name</label>
        <input v-model="form.siteName" class="form-control" required />
      </div>
    </FormSection>

    <!-- ================= FINANCIAL ================= -->
    <FormSection>
      <div class="col-md-4">
        <label class="form-label">Quantity</label>
        <DecimalInput v-model="form.quantity" required />
      </div>

      <div class="col-md-4">
        <label class="form-label">UOM</label>
        <input v-model="form.uom" class="form-control" />
      </div>

      <div class="col-md-4">
        <label class="form-label">Unit Price</label>
        <DecimalInput v-model="form.unitPrice" required />
        <div class="number-helper">
          {{ formatNumber(form.unitPrice) }}
        </div>
      </div>

      <div class="col-md-4">
        <label class="form-label">Total Price</label>
        <input
          :value="totalPriceDisplay"
          class="form-control"
          readonly
        />
      </div>
    </FormSection>

    <!-- STATUS & PIC 1 BARIS -->
    <FormSection>
      <div class="col-md-4">
        <label class="form-label">Status</label>
        <select v-model="form.status" class="form-select">
          <option
            v-for="option in statusOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="col-md-8">
        <label class="form-label">PIC</label>
        <input v-model="form.picArea" class="form-control" />
      </div>
    </FormSection>

    <!-- ================= REMARKS ================= -->
    <FormSection>
      <div class="col-12">
        <label class="form-label">Remarks Project</label>
        <textarea
          v-model="form.remarksProjectsDetails"
          class="form-control"
        ></textarea>
      </div>

      <div class="col-12">
        <label class="form-label">Remarks Delay</label>
        <textarea v-model="form.remarksDelay" class="form-control"></textarea>
      </div>

      <div class="col-12">
        <label class="form-label">Remarks Cancel</label>
        <textarea v-model="form.remarksCancel" class="form-control"></textarea>
      </div>
    </FormSection>
  </FormShell>
</template>
