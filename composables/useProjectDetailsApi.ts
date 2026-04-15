// composables/useProjectDetailsApi.ts
import { useProjectDetailsStore } from "@/stores/projectDetails";
import type { ProjectDetailItem } from "@/stores/projectDetails";
import { apiFetch } from "~/utils/apiFetch";

export const useProjectDetailsApi = () => {
  const store = useProjectDetailsStore();

  const getProjectDetails = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    projectId?: string;
    status?: string;
    cityKabId?: string;
  }) => {
    store.setLoading(true);

    try {
      const res: any = await apiFetch("/api/project_details", {
        query: {
          page: params?.page ?? store.page,
          limit: params?.limit ?? store.limit,
          search: params?.search,
          projectId: params?.projectId,
          status: params?.status,
          cityKabId: params?.cityKabId,
        },
      });

      store.setProjectDetails({
        items: res.data.items,
        page: res.data.page,
        limit: res.data.limit,
        total: res.data.total,
        totalPages: res.data.totalPages,
      });

    } finally {
      store.setLoading(false);
    }
  };

  const getProjectDetailById = async (id: string) => {
    const res: any = await apiFetch(`/api/project_details/${id}`);
    return res.data as ProjectDetailItem;
  };

  const createProjectDetail = async (payload: any) => {
    const res: any = await apiFetch("/api/project_details", {
      method: "POST",
      body: payload,
    });

    return res.data;
  };

  const createProjectDetailsBulk = async (payload: any[]) => {
    const res: any = await apiFetch("/api/project_details", {
      method: "POST",
      body: payload,
    });

    return res.data;
  };

  const updateProjectDetail = async (id: string, payload: any) => {
    const res: any = await apiFetch(`/api/project_details/${id}`, {
      method: "PUT",
      body: payload,
    });

    return res.data;
  };

  const deleteProjectDetail = async (id: string) => {
    await apiFetch(`/api/project_details/${id}`, {
      method: "DELETE",
    });

    // optional: remove from store
    store.setItems(store.items.filter((i) => i.id !== id));
  };

  return {
    getProjectDetails,
    getProjectDetailById,
    createProjectDetail,
    createProjectDetailsBulk,
    updateProjectDetail,
    deleteProjectDetail,
  };
};
