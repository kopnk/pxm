<script setup lang="ts">
definePageMeta({});

import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProjectDetailsApi } from "@/composables/useProjectDetailsApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import { useProjectDetailForm } from "@/composables/useProjectDetailForm";
import { useNotify } from "@/composables/useNotify";

/* ================= ROUTER ================= */
const route = useRoute();
const router = useRouter();
const id = typeof route.query.id === "string" ? route.query.id : "";

/* ================= API ================= */
const { getProjectDetailById, updateProjectDetail } = useProjectDetailsApi();
const { loading, handle } = useFormHandler();
const notify = useNotify();
const {
  form,
  projects,
  regions,
  subRegions,
  cities,
  selectedRegion,
  selectedSubRegion,
  projectSearch,
  showProjectDropdown,
  loading: optionsLoading,
  error,
  statusOptions,
  isValid,
  loadProjects,
  loadRegions,
  openProjectDropdown,
  selectProject,
  fillFromDetail,
  buildPayload,
} = useProjectDetailForm();

const pageLoading = ref(false);
const formLoading = computed(
  () => pageLoading.value || loading.value || optionsLoading.value,
);

/* ================= LOAD DATA ================= */

onMounted(async () => {
  if (!id) {
    router.push("/project-details");
    return;
  }

  pageLoading.value = true;

  try {
    await Promise.all([loadProjects(), loadRegions()]);
    const detail = await getProjectDetailById(id);
    await fillFromDetail(detail);
  } catch (err: any) {
    notify.error(error.value || err?.message || "Failed to load project detail");
    router.push("/project-details");
  } finally {
    pageLoading.value = false;
  }

  // ✅ MATIKAN preload SETELAH semua selesai
});

/* ================= SUBMIT ================= */

const handleSubmit = async () => {
  if (!isValid.value) {
    notify.warning("Project, city/kab, system key, and NE ID are required");
    return;
  }

  await handle(async () => {
    await updateProjectDetail(id, buildPayload());
    router.push("/project-details");
  }, toastSuccessUpdated("projectDetail"));
};
</script>

<template>
  <FormShell
    title="Update Project Detail"
    :loading="formLoading"
    @submit="handleSubmit"
    @cancel="() => router.push('/project-details')"
  >
    <!-- ================= PROJECT ================= -->
    <FormSection>
      <div class="col-md-12 position-relative">
        <label class="form-label">Project</label>
        <input
          class="form-control"
          v-model="projectSearch"
          @focus="openProjectDropdown"
          placeholder="Search project..."
          required
        />

        <div
          v-if="showProjectDropdown"
          class="list-group position-absolute w-100 shadow"
          style="z-index: 1000; max-height: 250px; overflow: auto"
        >
          <button
            type="button"
            class="list-group-item list-group-item-action"
            v-for="p in projects"
            :key="p.id"
            @click="selectProject(p)"
          >
            {{ p.projectName }} - {{ p.poNumber }}
          </button>
        </div>
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
        <input v-model="form.neId" class="form-control" required />
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
        <input v-model="form.siteName" class="form-control" />
      </div>
    </FormSection>

    <!-- ================= FINANCIAL ================= -->
    <FormSection>
      <div class="col-md-4">
        <label class="form-label">Quantity</label>
        <input
          type="number"
          v-model.number="form.quantity"
          class="form-control"
        />
      </div>

      <div class="col-md-4">
        <label class="form-label">UOM</label>
        <input v-model="form.uom" class="form-control" />
      </div>

      <div class="col-md-4">
        <label class="form-label">Unit Price</label>
        <input
          type="number"
          v-model.number="form.unitPrice"
          class="form-control"
        />
      </div>

      <div class="col-md-4">
        <label class="form-label">Total Price</label>
        <input
          type="number"
          v-model="form.totalPrice"
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
