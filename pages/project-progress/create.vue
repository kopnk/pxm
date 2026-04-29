<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";

import { useProjectProgressApi } from "@/composables/useProjectProgressApi";
import { useProgressStageApi } from "@/composables/useProgressStageApi";
import { useProgressStageStore } from "@/stores/progressStage";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessCreated } from "@/composables/useToastMessages";
import { apiFetch } from "~/utils/apiFetch";
import { formatProjectDetailSelectLabel } from "~/utils/formatProjectDetailSelectLabel";

const router = useRouter();

const { createProjectProgress } = useProjectProgressApi();
const { getProgressStages } = useProgressStageApi();

const progressStageStore = useProgressStageStore();

const { loading, handle } = useFormHandler();

const projects = ref<any[]>([]);
const projectSearch = ref("");
const showProjectDropdown = ref(false);

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

const projectDetails = ref<any[]>([]);

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

const initStageRows = () => {
  form.stageData = {};
  for (const s of stages.value) {
    form.stageData[s.code] = emptyStage();
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

const handleSubmit = async () => {
  if (!form.projectId) throw new Error("Project is required");

  if (!form.projectDetailId) throw new Error("Project Detail is required");

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

  await createProjectProgress({
    projectId: form.projectId,
    projectDetailId: form.projectDetailId,

    stageData: buildPayloadStageData(),

    remarksProjectsDetails: form.remarksProjectsDetails ?? null,
    remarksDelay: form.remarksDelay ?? null,
    remarksCancel: form.remarksCancel ?? null,
  });

  router.push("/project-progress");
};

onMounted(async () => {
  await loadStages();
  initStageRows();
  loadProjects();
});
</script>

<template>
  <FormShell
    title="Create Project Progress"
    :loading="loading"
    @submit="() => handle(handleSubmit, toastSuccessCreated('projectProgress'))"
    @cancel="() => router.push('/project-progress')"
  >
    <FormSection>
      <div class="col-md-12 position-relative">
        <label class="form-label">Project</label>
        <input
          class="form-control"
          v-model="projectSearch"
          @focus="showProjectDropdown = true"
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
            v-for="p in filteredProjects"
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
        <select
          v-model="form.projectDetailId"
          class="form-select"
          :disabled="!form.projectId"
          required
        >
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
