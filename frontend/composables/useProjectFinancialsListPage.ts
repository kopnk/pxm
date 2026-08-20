import { computed, onMounted, ref } from "vue";
import { useProjectFinancialsApi } from "@/composables/useProjectFinancialsApi";
import { useProjectFinancialsStore } from "@/stores/projectFinancials";
import { useFormHandler } from "@/composables/useFormHandler";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { useNotify } from "@/composables/useNotify";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import { formatListTimestamp as formatListTimestampWib } from "@/utils/formatListTimestamp";
import { getApiErrorMessage } from "@/lib/apiError";
import type { ProjectFinancialItem } from "@/stores/projectFinancials";
import type { RlsResource } from "~/lib/rls";
import {
  createStoreFilter,
  useFlatPaginationRange,
  watchDebouncedStoreSearch,
  watchStoreFilters,
} from "~/lib/listPage";

const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  issued: "Issued",
  approved: "Approved",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const useProjectFinancialsListPage = (options?: {
  /** Override flow filter saat halaman section (tax-in / tax-out / pph). */
  flowDirection?: "in" | "out";
  /** Backend tax section filter for auto tax pages. */
  taxSection?: "taxIn" | "taxOut" | "pph";
  /** RLS resource for button permissions on section pages. */
  rlsResource?: RlsResource;
}) => {
  const store = useProjectFinancialsStore();
  const { getProjectFinancials, deleteProjectFinancial } =
    useProjectFinancialsApi();
  const { canCreate, canEdit, canDelete } = useListPagePermissions(
    options?.rlsResource ?? "project_financials",
  );
  const { handle } = useFormHandler();
  const notify = useNotify();

  if (options?.flowDirection) {
    store.setFilters({ flowDirection: options.flowDirection });
  }

  const search = computed({
    get: () => store.filters.search,
    set: (value: string) => store.setFilters({ search: value }),
  });

  const status = computed({
    get: () => store.filters.status,
    set: (value: string) => store.setFilters({ status: value }),
  });

  const flowDirection = computed({
    get: () => store.filters.flowDirection,
    set: (value: string) => store.setFilters({ flowDirection: value }),
  });

  const fetchError = ref<string | null>(null);
  const deletingId = ref<string | null>(null);
  const deleteTargetId = ref<string | null>(null);
  const showDeleteModal = ref(false);

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "draft", label: "Draft" },
    { value: "issued", label: "Issued" },
    { value: "approved", label: "Approved" },
    { value: "paid", label: "Paid" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const flowDirectionOptions = [
    { value: "in", label: "In Flow" },
    { value: "out", label: "Out Flow" },
    { value: "", label: "All Flow" },
  ];

  const deleteTarget = computed(
    () =>
      store.items.find((item) => item.id === deleteTargetId.value) ?? null,
  );

  const { showingStart, showingEnd } = useFlatPaginationRange(store);

  const fetchData = async (page = store.page, showToast = true) => {
    try {
      fetchError.value = null;
      store.setPage(page);

      await getProjectFinancials({
        page,
        limit: store.limit,
        taxSection: options?.taxSection,
      });
    } catch (err: unknown) {
      fetchError.value = getApiErrorMessage(err, "Failed to load project financials");
      if (showToast) {
        notify.error(fetchError.value);
      }
      throw err;
    }
  };

  onMounted(() => {
    void fetchData(1).catch(() => {});
  });

  watchDebouncedStoreSearch(
    () => store.filters.search,
    () => void fetchData(1).catch(() => {}),
  );

  watchStoreFilters(
    () => [store.filters.status, store.filters.flowDirection] as const,
    () => void fetchData(1).catch(() => {}),
  );

  const prevPage = () => {
    if (store.page > 1) {
      void fetchData(store.page - 1).catch(() => {});
    }
  };

  const nextPage = () => {
    if (store.page < store.totalPages) {
      void fetchData(store.page + 1).catch(() => {});
    }
  };

  const openDeleteModal = (id: string) => {
    if (!canDelete.value) return;
    deleteTargetId.value = id;
    showDeleteModal.value = true;
  };

  const cancelDelete = () => {
    if (deletingId.value) return;
    deleteTargetId.value = null;
    showDeleteModal.value = false;
  };

  const performDelete = async () => {
    if (!deleteTargetId.value || deletingId.value) return;
    const targetId = deleteTargetId.value;

    try {
      await handle(async () => {
        deletingId.value = targetId;
        await deleteProjectFinancial(targetId);
        await fetchData(store.page, false);
      }, toastSuccessDeleted("projectFinancial"));

      showDeleteModal.value = false;
      deleteTargetId.value = null;
    } finally {
      deletingId.value = null;
    }
  };

  const formatCurrencyIdr = (value: unknown) => {
    const n =
      value === null || value === undefined || value === ""
        ? null
        : Number(value);
    if (n === null || !Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  };

  const formatQty = (value: unknown) => {
    const n =
      value === null || value === undefined || value === ""
        ? null
        : Number(value);
    if (n === null || !Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }).format(n);
  };

  const getRowNumber = (index: number) =>
    (store.page - 1) * store.limit + index + 1;

  const getFinancialStatusBadgeClass = (value: string | null | undefined) => ({
    "bg-secondary": value === "draft" || !value,
    "bg-info text-dark": value === "issued",
    "bg-success": value === "approved",
    "bg-primary": value === "paid",
    "bg-danger": value === "cancelled",
  });

  const formatFinancialStatusLabel = (value: string | null | undefined) =>
    FINANCIAL_STATUS_LABELS[value ?? "draft"] ?? "Draft";

  const deleteModalLabel = (item: ProjectFinancialItem | null) => {
    if (!item) return "this financial record";
    return (
      item.detailSiteName?.trim() ||
      item.projectName?.trim() ||
      item.projectPoNumber?.trim() ||
      "this financial record"
    );
  };

  const showPartnerLineTotal = computed(
    () => store.filters.flowDirection !== "out",
  );
  const showClientLineTotal = computed(
    () => store.filters.flowDirection !== "in",
  );

  return {
    store,
    canCreate,
    canEdit,
    canDelete,
    search,
    status,
    flowDirection,
    showPartnerLineTotal,
    showClientLineTotal,
    statusOptions,
    flowDirectionOptions,
    fetchError,
    deletingId,
    deleteTarget,
    showDeleteModal,
    showingStart,
    showingEnd,
    fetchData,
    prevPage,
    nextPage,
    openDeleteModal,
    cancelDelete,
    performDelete,
    formatCurrencyIdr,
    formatQty,
    formatListTimestamp: formatListTimestampWib,
    getRowNumber,
    getFinancialStatusBadgeClass,
    formatFinancialStatusLabel,
    deleteModalLabel,
  };
};
