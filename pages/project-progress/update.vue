<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProjectProgressApi } from "@/composables/useProjectProgressApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import { useProgressStageApi } from "@/composables/useProgressStageApi";
import { useProgressStageStore } from "@/stores/progressStage";
import { apiFetch } from "~/utils/apiFetch";
import { formatProjectDetailSelectLabel } from "~/utils/formatProjectDetailSelectLabel";

const route = useRoute();
const router = useRouter();
const id = route.query.id as string;

const { getProjectProgressById, updateProjectProgress } =
  useProjectProgressApi();

const { loading, handle } = useFormHandler();
const { getProgressStages } = useProgressStageApi();
const progressStageStore = useProgressStageStore();

const projects = ref<any[]>([]);
const projectSearch = ref("");
const showProjectDropdown = ref(false);
const projectDetails = ref<any[]>([]);

const loadProjects = async () => {
  const res: any = await apiFetch("/api/projects", {
    query: { limit: 1000 },
  });
  projects.value = res.data.items;
};

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

const loadProjectDetails = async (projectId: string) => {
  const res: any = await apiFetch("/api/project_details", {
    query: { projectId, limit: 1000 },
  });
  projectDetails.value = res.data.items;
};

const selectProject = async (p: any) => {
  form.projectId = p.id;
  projectSearch.value = `${p.projectName} - ${p.poNumber}`;
  showProjectDropdown.value = false;
  await loadProjectDetails(p.id);
};

type StageForm = {
  plan_submit_date: string | null;
  actual_approve_date: string | null;
  status: string;
};

const emptyStage = (): StageForm => ({
  plan_submit_date: null,
  actual_approve_date: null,
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

const row = (code: string): StageForm => {
  if (!form.stageData[code]) {
    form.stageData[code] = emptyStage();
  }
  return form.stageData[code];
};

const mergeLoadedStageData = (loaded: Record<string, any> | null) => {
  form.stageData = {};
  const src = loaded ?? {};

  for (const s of stages.value) {
    const cur = src[s.code];
    form.stageData[s.code] = {
      plan_submit_date: cur?.plan_submit_date ?? null,
      actual_approve_date: cur?.actual_approve_date ?? null,
      status: cur?.status ?? "pending",
    };
  }

  for (const key of Object.keys(src)) {
    if (form.stageData[key]) continue;
    const cur = src[key];
    form.stageData[key] = {
      plan_submit_date: cur?.plan_submit_date ?? null,
      actual_approve_date: cur?.actual_approve_date ?? null,
      status: cur?.status ?? "pending",
    };
  }
};

const buildPayloadStageData = () => {
  const out: Record<string, StageForm> = {};
  for (const s of stages.value) {
    const r = row(s.code);
    out[s.code] = {
      plan_submit_date: r.plan_submit_date || null,
      actual_approve_date: r.actual_approve_date || null,
      status: r.status,
    };
  }
  for (const key of Object.keys(form.stageData)) {
    if (out[key]) continue;
    out[key] = { ...form.stageData[key] };
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

onMounted(async () => {
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

  if (data.projectId) {
    const p = projects.value.find((x) => x.id === data.projectId);
    if (p) {
      projectSearch.value = `${p.projectName} - ${p.poNumber}`;
      await loadProjectDetails(p.id);
    }
  }
});

const handleSubmit = async () => {
  if (!form.projectId || !form.projectDetailId) {
    throw new Error("Project and project detail are required");
  }

  await updateProjectProgress(id, {
    projectId: form.projectId,
    projectDetailId: form.projectDetailId,
    stageData: buildPayloadStageData(),
    remarksProjectsDetails: form.remarksProjectsDetails ?? null,
    remarksDelay: form.remarksDelay ?? null,
    remarksCancel: form.remarksCancel ?? null,
  });

  router.push("/project-progress");
};
</script>

<template>
  <FormShell
    title="Update Project Progress"
    :loading="loading"
    @submit="() => handle(handleSubmit, toastSuccessUpdated('projectProgress'))"
    @cancel="() => router.push('/project-progress')"
  >
    <FormSection>
      <div class="col-md-12 position-relative">
        <label class="form-label">Project</label>
        <input
          class="form-control"
          v-model="projectSearch"
          @focus="showProjectDropdown = true"
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

    <FormSection>
      <div class="col-md-12">
        <label class="form-label">Project Detail</label>
        <select v-model="form.projectDetailId" class="form-select">
          <option value="">-- Select Detail --</option>
          <option v-for="d in projectDetails" :key="d.id" :value="d.id">
            {{ formatProjectDetailSelectLabel(d) }}
          </option>
        </select>
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
                <th style="min-width: 140px">Status</th>
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
</template>
