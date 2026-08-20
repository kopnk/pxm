import { apiFetch } from "~/utils/apiFetch";
import { useProgressStageStore, type ProgressStage } from "@/stores/progressStage";

export const useProgressStageApi = () => {
  const store = useProgressStageStore();

  /* ================= GET LIST ================= */
  const getProgressStages = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    stageType?: string;
    isActive?: boolean;
  }) => {
    store.setLoading(true);

    try {
      const res: any = await apiFetch("/api/progress_stage", {
        query: {
          page: params?.page ?? store.page,
          limit: params?.limit ?? store.limit,
          search: params?.search || undefined,
          stageType: params?.stageType || undefined,
          isActive: params?.isActive,
        },
      });

      store.setItems(res.data?.items ?? []);
      store.setPagination({
        page: Number(res.data?.page ?? store.page) || 1,
        limit: Number(res.data?.limit ?? store.limit) || store.limit,
        total: Number(res.data?.total ?? 0),
        totalPages: Number(res.data?.totalPages ?? 1) || 1,
      });

      return res;
    } finally {
      store.setLoading(false);
    }
  };

  /* ================= GET DETAIL ================= */
  const getProgressStageById = (id: string) =>
    apiFetch(`/api/progress_stage/${id}`);

  /* ================= CREATE ================= */
  const createProgressStage = async (payload: {
    code: string;
    name: string;
    stageType: "admin" | "field" | "document";
    sequence: number;
    isRequired?: boolean;
    isActive?: boolean;
  }) => {
    return await apiFetch("/api/progress_stage", {
      method: "POST",
      body: payload,
    });
  };

  /* ================= UPDATE ================= */
  const updateProgressStage = (id: string, payload: Partial<ProgressStage>) =>
    apiFetch(`/api/progress_stage/${id}`, {
      method: "PUT",
      body: payload,
    });

  /* ================= DELETE ================= */
  const deleteProgressStage = async (id: string) => {
    await apiFetch(`/api/progress_stage/${id}`, {
      method: "DELETE",
    });

    store.setItems(store.items.filter((item) => item.id !== id));
  };

  return {
    getProgressStages,
    getProgressStageById,
    createProgressStage,
    updateProgressStage,
    deleteProgressStage,
  };
};
