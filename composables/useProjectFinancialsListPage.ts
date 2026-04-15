import { computed, onMounted, ref, watch } from "vue";
import { useProjectFinancialsApi } from "@/composables/useProjectFinancialsApi";
import { useProjectFinancialsStore } from "@/stores/projectFinancials";
import { useFormHandler } from "@/composables/useFormHandler";
import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { useNotify } from "@/composables/useNotify";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
import type { ProjectFinancialItem } from "@/stores/projectFinancials";

const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  issued: "Issued",
  approved: "Approved",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const useProjectFinancialsListPage = () => {
  const store = useProjectFinancialsStore();
  const { getProjectFinancials, deleteProjectFinancial } =
    useProjectFinancialsApi();
  const { canCreate, canEdit, canDelete } = useListPagePermissions();
  const { handle } = useFormHandler();
  const notify = useNotify();

  const search = ref("");
  const status = ref("");
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

  const deleteTarget = computed(
    () =>
      store.items.find((item) => item.id === deleteTargetId.value) ?? null,
  );

  const showingStart = computed(() => {
    if (store.total === 0) return 0;
    return (store.page - 1) * store.limit + 1;
  });

  const showingEnd = computed(() =>
    Math.min(store.page * store.limit, store.total),
  );

  const getErrorMessage = (err: unknown) => {
    const e = err as { data?: { message?: string }; message?: string };
    return e?.data?.message || e?.message || "Failed to load project financials";
  };

  const fetchData = async (page = store.page, showToast = true) => {
    try {
      fetchError.value = null;
      store.setPage(page);

      await getProjectFinancials({
        page,
        limit: store.limit,
        search: search.value || undefined,
        status: status.value || undefined,
      });
    } catch (err: unknown) {
      fetchError.value = getErrorMessage(err);
      if (showToast) {
        notify.error(fetchError.value);
      }
      throw err;
    }
  };

  onMounted(() => {
    void fetchData(1).catch(() => {});
  });

  watch([search, status], () => {
    void fetchData(1).catch(() => {});
  });

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

  const formatListTimestamp = (v: string | null | undefined) => {
    if (v == null || v === "") return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      return String(v).replace("T", " ").slice(0, 19);
    }
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  return {
    store,
    canCreate,
    canEdit,
    canDelete,
    search,
    status,
    statusOptions,
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
    formatListTimestamp,
    getRowNumber,
    getFinancialStatusBadgeClass,
    formatFinancialStatusLabel,
    deleteModalLabel,
  };
};
