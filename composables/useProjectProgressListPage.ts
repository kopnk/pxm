import { computed, onMounted, ref, watch } from "vue";
import { useProjectProgressApi } from "@/composables/useProjectProgressApi";
import { useProjectProgressStore } from "@/stores/projectProgress";
import { useFormHandler } from "@/composables/useFormHandler";
import { useProgressStageApi } from "@/composables/useProgressStageApi";
import { useProgressStageStore } from "@/stores/progressStage";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import { useAuthStore } from "@/stores/auth";
import { useProjectProgressExport } from "@/composables/useProjectProgressExport";
import {
  createStoreFilter,
  useFlatPaginationRange,
  watchDebouncedStoreSearch,
  watchStoreFilters,
} from "~/lib/listPage";

export const useProjectProgressListPage = () => {
  const store = useProjectProgressStore();
  const { getProjectProgress, deleteProjectProgress } = useProjectProgressApi();
  const { getProgressStages } = useProgressStageApi();
  const progressStageStore = useProgressStageStore();
  const authStore = useAuthStore();
  const { canCreate, canEdit, canDelete } =
    useListPagePermissions("project_progress");
  const { handle } = useFormHandler();

  const canCreateProjectProgress = computed(
    () => canCreate.value && authStore.user?.role === "superadmin",
  );

  const { exporting, downloadExcel } = useProjectProgressExport();

  const searchFilter = createStoreFilter(store, "search");
  const stageFilter = createStoreFilter(store, "stage");
  const stageDateTypeFilter = createStoreFilter(store, "stageDateType");
  const statusFilter = createStoreFilter(store, "status");

  const showDeleteModal = ref(false);
  const deleteTargetId = ref<string | null>(null);
  const deleteTargetLabel = ref("this project progress");

  const stageColumns = computed(() =>
    [...progressStageStore.items].sort((a, b) => a.sequence - b.sequence),
  );

  const stageFilterOptions = computed(() =>
    stageColumns.value.map((item) => ({
      code: item.code,
      label: item.name?.trim() ? item.name : item.code,
    })),
  );

  const stageDateTypeEnabled = computed(() => Boolean(store.filters.stage));

  const stageDateCounts = computed(() => {
    const counts: Record<string, { plan: number; actual: number }> = {};

    for (const stage of stageColumns.value) {
      counts[stage.code] = { plan: 0, actual: 0 };
    }

    for (const [code, value] of Object.entries(store.stageCounts ?? {})) {
      if (!counts[code]) {
        counts[code] = { plan: 0, actual: 0 };
      }
      counts[code].plan = Number(value?.plan ?? 0);
      counts[code].actual = Number(value?.actual ?? 0);
    }

    return counts;
  });

  const tableColspan = computed(() => 4 + stageColumns.value.length);

  const fetchData = async () => {
    await getProjectProgress({
      page: store.page,
      limit: store.limit,
    });
  };

  onMounted(async () => {
    const res: any = await getProgressStages({
      limit: 1000,
      isActive: true,
    });
    progressStageStore.setItems(res.data.items);
    await fetchData();
  });

  watch(
    () => store.filters.stage,
    () => {
      store.setFilters({ stageDateType: "" });
    },
  );

  watchDebouncedStoreSearch(
    () => store.filters.search,
    () => {
      store.setPage(1);
      void fetchData();
    },
  );

  watchStoreFilters(
    () =>
      [
        store.filters.stage,
        store.filters.stageDateType,
        store.filters.status,
      ] as const,
    () => {
      store.setPage(1);
      void fetchData();
    },
  );

  const onExportExcel = () => {
    void downloadExcel({
      search: store.filters.search,
      stage: store.filters.stage,
      stageDateType: store.filters.stageDateType,
      status: store.filters.status,
      page: store.page,
      limit: store.limit,
    });
  };

  const handleDelete = async (id: string, siteName?: string | null) => {
    if (!canDelete.value) return;
    deleteTargetId.value = id;
    deleteTargetLabel.value = siteName?.trim() || "this project progress";
    showDeleteModal.value = true;
  };

  const performDelete = async () => {
    if (!deleteTargetId.value) return;
    await handle(async () => {
      await deleteProjectProgress(deleteTargetId.value!);
      fetchData();
    }, toastSuccessDeleted("projectProgress"));
    showDeleteModal.value = false;
    deleteTargetId.value = null;
  };

  const cancelDelete = () => {
    showDeleteModal.value = false;
    deleteTargetId.value = null;
    deleteTargetLabel.value = "this project progress";
  };

  const prevPage = () => {
    if (store.page > 1) {
      store.setPage(store.page - 1);
      fetchData();
    }
  };

  const nextPage = () => {
    if (store.page < store.totalPages) {
      store.setPage(store.page + 1);
      fetchData();
    }
  };

  const { showingStart, showingEnd } = useFlatPaginationRange(store);

  return {
    store,
    canCreate,
    canEdit,
    canDelete,
    canCreateProjectProgress,
    exporting,
    searchFilter,
    stageFilter,
    stageDateTypeFilter,
    statusFilter,
    showDeleteModal,
    deleteTargetLabel,
    stageColumns,
    stageFilterOptions,
    stageDateTypeEnabled,
    stageDateCounts,
    tableColspan,
    onExportExcel,
    handleDelete,
    performDelete,
    cancelDelete,
    prevPage,
    nextPage,
    showingStart,
    showingEnd,
  };
};
