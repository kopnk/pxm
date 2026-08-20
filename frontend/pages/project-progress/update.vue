<script setup lang="ts">
import {
  ref,
  reactive,
  onMounted,
  onBeforeUnmount,
  computed,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProjectProgressApi } from "@/composables/useProjectProgressApi";
import {
  useProjectFilesApi,
} from "@/composables/useProjectFilesApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import { useNotify } from "@/composables/useNotify";
import { useProgressStageApi } from "@/composables/useProgressStageApi";
import { useProgressStageStore } from "@/stores/progressStage";
import { useProjectProgressDetailOptions } from "@/composables/useProjectProgressDetailOptions";
import {
  PROJECT_FILE_REF_TABLE,
  saveRefDocuments,
  useRefDocumentFields,
} from "@/composables/useProjectRefDocuments";
import { useProjectRefFilesList } from "@/composables/useProjectRefFilesList";
import { apiFetch } from "~/utils/apiFetch";
import ProgressStageDocCells from "@/components/form/ProgressStageDocCells.vue";
import { formatProjectDetailSelectLabel } from "~/utils/formatProjectDetailSelectLabel";
import type {
  ProjectProgressStageData,
  ProjectProgressStatus,
} from "@/stores/projectProgress";

const route = useRoute();
const router = useRouter();
const id = route.query.id as string;

const { getProjectProgressById, updateProjectProgress } =
  useProjectProgressApi();
const { uploadProjectFile, createProjectFileByUrl } = useProjectFilesApi();

const { loading, handle } = useFormHandler();
const notify = useNotify();
const { getProgressStages } = useProgressStageApi();
const progressStageStore = useProgressStageStore();

const projects = ref<any[]>([]);
const projectSearch = ref("");
const showProjectDropdown = ref(false);
const projectPickerRef = ref<HTMLElement | null>(null);

const stageCodes = () => stages.value.map((s) => s.code);
const {
  files: selectedDocFiles,
  urls: selectedDocUrls,
  syncSlots: syncDocSlots,
  setUrl: setDocUrl,
  setFileFromEvent: onDocFileChange,
  reset: resetDocumentFields,
  hasPending: hasPendingDocuments,
} = useRefDocumentFields(stageCodes);

const {
  deletingFileId,
  showDeleteModal: showDeleteFileModal,
  deleteTargetFile,
  canDelete: canDeleteDoc,
  docsForCategory: docsForStage,
  load: loadProjectFiles,
  requestDelete: requestDeleteProjectFile,
  cancelDelete: cancelDeleteProjectFile,
  remove: removeProjectFile,
  deleteMessage: projectFileDeleteMessage,
} = useProjectRefFilesList(PROJECT_FILE_REF_TABLE.PROGRESS, () => id);

const loadProjects = async () => {
  const res: any = await apiFetch("/api/projects", {
    query: { limit: 1000 },
  });
  projects.value = res.data.items;
};

const filteredProjects = computed(() => {
  if (!projectSearch.value) return projects.value;

  const keyword = projectSearch.value.toLowerCase();

  return projects.value.filter((p) =>
    `${p.projectName} ${p.poNumber}`.toLowerCase().includes(keyword),
  );
});

const loadStages = async () => {
  const res: any = await getProgressStages({
    limit: 1000,
    isActive: true,
  });
  progressStageStore.setItems(res.data.items);
};

const stages = computed(() =>
  [...progressStageStore.items].sort((a, b) => a.sequence - b.sequence),
);

const selectProject = async (p: any) => {
  const projectChanged = form.projectId !== p.id;
  form.projectId = p.id;
  if (projectChanged) {
    form.projectDetailId = "";
  }
  projectSearch.value = `${p.projectName} - ${p.poNumber}`;
  showProjectDropdown.value = false;
  await refreshForProject(p.id, id);
};

const openProjectDropdown = () => {
  showProjectDropdown.value = true;
};

const closeProjectDropdown = () => {
  showProjectDropdown.value = false;
};

const handleDocumentPointerDown = (event: PointerEvent) => {
  if (projectPickerRef.value?.contains(event.target as Node)) return;
  closeProjectDropdown();
};

type StageForm = {
  plan_submit_date: string | null;
  actual_approve_date: string | null;
  remarks: string | null;
  status: ProjectProgressStatus;
};

const emptyStage = (): StageForm => ({
  plan_submit_date: null,
  actual_approve_date: null,
  remarks: null,
  status: "pending",
});

const form = reactive({
  projectId: "" as string,
  projectDetailId: "" as string,
  stageData: {} as Record<string, StageForm>,
  remarksProjectsDetails: null as string | null,
  remarksDelay: null as string | null,
  remarksCancel: null as string | null,
});

const {
  usedProjectDetailIdSet,
  availableProjectDetails,
  refreshForProject,
} = useProjectProgressDetailOptions({
  currentDetailId: () => form.projectDetailId,
});

const row = (code: string): StageForm => {
  if (!form.stageData[code]) {
    form.stageData[code] = emptyStage();
  }
  return form.stageData[code];
};

const mergeLoadedStageData = (loaded: Record<string, any> | null) => {
  form.stageData = {};
  syncDocSlots();
  const src = loaded ?? {};

  for (const s of stages.value) {
    const cur = src[s.code];
    form.stageData[s.code] = {
      plan_submit_date: cur?.plan_submit_date ?? null,
      actual_approve_date: cur?.actual_approve_date ?? null,
      remarks: cur?.remarks ?? null,
      status: cur?.status ?? "pending",
    };
  }

  for (const key of Object.keys(src)) {
    if (form.stageData[key]) continue;
    const cur = src[key];
    form.stageData[key] = {
      plan_submit_date: cur?.plan_submit_date ?? null,
      actual_approve_date: cur?.actual_approve_date ?? null,
      remarks: cur?.remarks ?? null,
      status: cur?.status ?? "pending",
    };
  }
};

const buildPayloadStageData = (): ProjectProgressStageData => {
  const out: ProjectProgressStageData = {};
  for (const s of stages.value) {
    const r = row(s.code);
    out[s.code] = {
      plan_submit_date: r.plan_submit_date || null,
      actual_approve_date: r.actual_approve_date || null,
      remarks: r.remarks?.trim() || null,
      status: r.status,
    };
  }
  for (const key of Object.keys(form.stageData)) {
    if (out[key]) continue;
    const existing = form.stageData[key];
    if (!existing) continue;
    out[key] = { ...existing };
  }
  return out;
};

const loadRemarksFromDetail = async (detailId: string) => {
  try {
    const res: any = await apiFetch(`/api/project_details/${detailId}`);
    const d = res.data;
    form.remarksProjectsDetails = d.remarksProjectsDetails ?? null;
    form.remarksDelay = d.remarksDelay ?? null;
    form.remarksCancel = d.remarksCancel ?? null;
  } catch {
    /* ignore */
  }
};

watch(
  () => form.projectDetailId,
  async (newId, oldId) => {
    if (!newId || newId === oldId) return;
    await loadRemarksFromDetail(newId);
  },
);

watch(
  availableProjectDetails,
  (details) => {
    if (!form.projectDetailId) return;
    if (details.some((detail) => detail.id === form.projectDetailId)) return;
    form.projectDetailId = "";
  },
  { deep: true },
);

onMounted(async () => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);

  if (!id) {
    router.push("/project-progress");
    return;
  }

  await loadStages();
  await loadProjects();

  const res: any = await getProjectProgressById(id);
  const data = res.data;

  form.projectId = data.projectId ?? "";
  form.projectDetailId = data.projectDetailId ?? "";
  form.remarksProjectsDetails = data.remarksProjectsDetails ?? null;
  form.remarksDelay = data.remarksDelay ?? null;
  form.remarksCancel = data.remarksCancel ?? null;

  mergeLoadedStageData(data.stageData);
  await loadProjectFiles();

  if (data.projectId) {
    const p = projects.value.find((x) => x.id === data.projectId);
    if (p) {
      projectSearch.value = `${p.projectName} - ${p.poNumber}`;
      await refreshForProject(p.id, id);
    }
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
});

const handleSubmit = async () => {
  if (!form.projectId || !form.projectDetailId) {
    throw new Error("Project and project detail are required");
  }

  if (usedProjectDetailIdSet.value.has(form.projectDetailId)) {
    throw new Error(
      "Project detail already has project progress. Please update the existing progress instead.",
    );
  }

  for (const s of stages.value) {
    const current = row(s.code);
    if (current.status === "approved" && !current.actual_approve_date) {
      throw new Error(`Actual / approve date is required for stage ${s.name}`);
    }
    if (
      current.status === "delayed" &&
      !String(form.remarksDelay ?? "").trim()
    ) {
      throw new Error(
        "Remarks delay is required when any stage status is delayed",
      );
    }
  }

  await updateProjectProgress(id, {
    projectId: form.projectId,
    projectDetailId: form.projectDetailId,
    stageData: buildPayloadStageData(),
    remarksProjectsDetails: form.remarksProjectsDetails ?? null,
    remarksDelay: form.remarksDelay ?? null,
    remarksCancel: form.remarksCancel ?? null,
  });

  if (hasPendingDocuments()) {
    try {
      await saveRefDocuments(
        { uploadProjectFile, createProjectFileByUrl },
        PROJECT_FILE_REF_TABLE.PROGRESS,
        id,
        selectedDocFiles,
        selectedDocUrls,
      );
      resetDocumentFields();
    } catch (err: any) {
      notify.warning(
        err?.data?.message ||
          err?.message ||
          "Project progress updated, but document save failed",
      );
      throw err;
    }
  }

  await router.push("/project-progress");
};
</script>

<template>
  <FormShell
    title="Update Project Progress"
    :loading="loading"
    submit-label="Update"
    @submit="() => handle(handleSubmit, toastSuccessUpdated('projectProgress'))"
    @cancel="() => router.push('/project-progress')"
  >
    <FormSection>
      <div ref="projectPickerRef" class="col-md-12 position-relative">
        <label class="form-label">Project</label>
        <input
          class="form-control"
          v-model="projectSearch"
          placeholder="Search project..."
          @click="openProjectDropdown"
          @input="openProjectDropdown"
          @keydown.down.prevent="openProjectDropdown"
          @keydown.esc="closeProjectDropdown"
        />

        <div
          v-if="showProjectDropdown"
          class="list-group position-absolute w-100 shadow"
          style="z-index: 1000; max-height: 250px; overflow: auto"
        >
          <button
            type="button"
            class="list-group-item list-group-item-action"
            v-for="p in filteredProjects"
            :key="p.id"
            @click="selectProject(p)"
          >
            {{ p.projectName }} - {{ p.poNumber }}
          </button>
          <div
            v-if="!filteredProjects.length"
            class="list-group-item text-body-secondary"
          >
            No projects found
          </div>
        </div>
      </div>
    </FormSection>

    <FormSection>
      <div class="col-md-12">
        <label class="form-label">Project Detail</label>
        <select v-model="form.projectDetailId" class="form-select">
          <option value="">-- Select Detail --</option>
          <option v-for="d in availableProjectDetails" :key="d.id" :value="d.id">
            {{ formatProjectDetailSelectLabel(d) }}
          </option>
        </select>
        <small
          v-if="form.projectId && !availableProjectDetails.length"
          class="text-body-secondary"
        >
          All other project details for this project already have progress records.
        </small>
      </div>
    </FormSection>

    <FormSection>
      <div class="col-12">
        <label class="form-label mb-2">Stages (plan &amp; actual)</label>
        <div class="table-responsive border rounded">
          <table class="table table-sm align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="min-width: 140px">Stage</th>
                <th style="min-width: 160px">Plan / submit</th>
                <th style="min-width: 160px">Actual / approve</th>
                <th style="min-width: 320px">Remarks Stage</th>
                <th style="min-width: 140px">Status</th>
                <th style="min-width: 200px">Document URL</th>
                <th style="min-width: 180px">Upload file</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in stages" :key="s.id">
                <td class="fw-semibold">{{ s.name }}</td>
                <td>
                  <input
                    type="date"
                    class="form-control form-control-sm"
                    v-model="row(s.code).plan_submit_date"
                  />
                </td>
                <td>
                  <input
                    type="date"
                    class="form-control form-control-sm"
                    v-model="row(s.code).actual_approve_date"
                  />
                </td>
                <td>
                  <textarea
                    v-model="row(s.code).remarks"
                    class="form-control form-control-sm"
                    rows="2"
                    maxlength="2000"
                    :placeholder="`Remarks ${s.name}`"
                    style="min-width: 300px; resize: vertical"
                  />
                </td>
                <td>
                  <select
                    class="form-select form-select-sm"
                    v-model="row(s.code).status"
                  >
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="delayed">Delayed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <ProgressStageDocCells
                  :url="selectedDocUrls[s.code] ?? ''"
                  :selected-file-name="selectedDocFiles[s.code]?.name ?? null"
                  :existing-files="docsForStage(s.code)"
                  :can-delete="canDeleteDoc"
                  :deleting-id="deletingFileId"
                  @update:url="setDocUrl(s.code, $event)"
                  @file-change="onDocFileChange(s.code, $event)"
                  @delete="requestDeleteProjectFile"
                />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </FormSection>

    <FormSection>
      <div class="col-12">
        <label class="form-label">Remarks project</label>
        <textarea
          v-model="form.remarksProjectsDetails"
          class="form-control"
          rows="2"
        />
      </div>

      <div class="col-12">
        <label class="form-label">Remarks delay</label>
        <textarea v-model="form.remarksDelay" class="form-control" rows="2" />
      </div>

      <div class="col-12">
        <label class="form-label">Remarks cancel</label>
        <textarea
          v-model="form.remarksCancel"
          class="form-control"
          rows="2"
        />
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
