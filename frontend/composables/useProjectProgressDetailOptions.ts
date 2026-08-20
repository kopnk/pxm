import { computed, ref } from "vue";
import { apiFetch } from "~/utils/apiFetch";

type ProjectDetailLike = {
  id: string;
  siteId?: string | null;
  siteName?: string | null;
  materialName?: string | null;
};

type UseProjectProgressDetailOptionsInput = {
  currentDetailId?: () => string;
};

export const useProjectProgressDetailOptions = (
  input: UseProjectProgressDetailOptionsInput = {},
) => {
  const projectDetails = ref<ProjectDetailLike[]>([]);
  const usedProjectDetailIds = ref<string[]>([]);

  const currentDetailId = computed(() => input.currentDetailId?.() ?? "");
  const usedProjectDetailIdSet = computed(() => new Set(usedProjectDetailIds.value));
  const availableProjectDetails = computed(() =>
    projectDetails.value.filter(
      (detail) =>
        detail.id === currentDetailId.value ||
        !usedProjectDetailIdSet.value.has(detail.id),
    ),
  );

  const loadProjectDetails = async (projectId: string) => {
    const res: any = await apiFetch("/api/project_details", {
      query: { projectId, limit: 1000 },
    });

    projectDetails.value = res.data.items ?? [];
  };

  const loadUsedProjectDetailIds = async (
    projectId: string,
    excludeProgressId?: string,
  ) => {
    const res: any = await apiFetch("/api/project_progress/detail-usage", {
      query: {
        projectId,
        excludeProgressId: excludeProgressId || undefined,
      },
    });

    usedProjectDetailIds.value = (res.data?.projectDetailIds ?? [])
      .map((item: unknown) => String(item ?? "").trim())
      .filter(Boolean);
  };

  const refreshForProject = async (projectId: string, excludeProgressId?: string) => {
    await Promise.all([
      loadProjectDetails(projectId),
      loadUsedProjectDetailIds(projectId, excludeProgressId),
    ]);
  };

  return {
    projectDetails,
    usedProjectDetailIdSet,
    availableProjectDetails,
    loadProjectDetails,
    loadUsedProjectDetailIds,
    refreshForProject,
  };
};
