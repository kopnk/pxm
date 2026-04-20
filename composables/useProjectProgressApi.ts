// composables/useProjectProgressApi.ts

import { useProjectProgressStore } from "@/stores/projectProgress";
import type { ProjectProgressItem } from "@/stores/projectProgress";
import { apiFetch } from "~/utils/apiFetch";

export const useProjectProgressApi = () => {

  const store = useProjectProgressStore();

  /* ================= GET LIST ================= */

  const getProjectProgress = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    project?: string;
    detail?: string;
    stage?: string;
    status?: string;
  }) => {

    store.setLoading(true);

    try {

      const res: any = await apiFetch("/api/project_progress", {
        query: {
          page: params?.page ?? store.page,
          limit: params?.limit ?? store.limit,
          search: params?.search,
          project: params?.project,
          detail: params?.detail,
          stage: params?.stage,
          status: params?.status,
        },
      });

      const total = Number(res.data?.total ?? 0);
      const limit = Number(res.data?.limit ?? store.limit) || store.limit;
      const page = Number(res.data?.page ?? store.page) || 1;
      const totalPagesFromApi = res.data?.totalPages;
      const totalPages =
        typeof totalPagesFromApi === "number" && totalPagesFromApi > 0
          ? totalPagesFromApi
          : Math.max(1, Math.ceil(total / limit));

      store.setProjectProgress({
        items: res.data.items ?? [],
        page,
        limit,
        total,
        totalPages,
      });

    } finally {
      store.setLoading(false);
    }
  };

  /* ================= GET DETAIL ================= */

  const getProjectProgressById = (id: string) =>
    apiFetch(`/api/project_progress/${id}`);

  /* ================= CREATE ================= */

  const createProjectProgress = (payload: Partial<ProjectProgressItem>) =>
    apiFetch("/api/project_progress", {
      method: "POST",
      body: payload,
    });

  /* ================= UPDATE ================= */

  const updateProjectProgress = (
    id: string,
    payload: Partial<ProjectProgressItem>
  ) =>
    apiFetch(`/api/project_progress/${id}`, {
      method: "PUT",
      body: payload,
    });

  /* ================= DELETE ================= */

  const deleteProjectProgress = async (id: string) => {

    await apiFetch(`/api/project_progress/${id}`, {
      method: "DELETE",
    });

    store.setItems(
      store.items.filter((item) => item.id !== id)
    );
  };

  return {
    getProjectProgress,
    getProjectProgressById,
    createProjectProgress,
    updateProjectProgress,
    deleteProjectProgress,
  };
};