import { useProjectsStore } from "@/stores/projects";
import type { Project } from "@/stores/projects";
import { apiFetch } from "~/utils/apiFetch";

export const useProjectsApi = () => {
  const store = useProjectsStore();

  const getProjects = async (params?: {
    page?: number;
    limit?: number;
  }) => {
    store.setLoading(true);

    try {
      const res: any = await apiFetch("/api/projects", {
        query: {
          page: params?.page ?? store.meta.page,
          limit: params?.limit ?? store.meta.limit,
          search: store.filters.search || undefined,
          status: store.filters.status || undefined,
        },
      });

      store.setProjects(res.data.items, {
        page: res.data.page,
        limit: res.data.limit,
        total: res.data.total,
        totalPages: res.data.totalPages,
      });

    } finally {
      store.setLoading(false);
    }
  };

  const createProject = (payload: any) =>
    apiFetch("/api/projects", { method: "POST", body: payload });

  const getProjectById = async (id: string) => {
    const res: any = await apiFetch(`/api/projects/${id}`);
    return res.data as Project;
  };

  const updateProject = (id: string, payload: any) =>
    apiFetch(`/api/projects/${id}`, { method: "PUT", body: payload });

  const deleteProject = async (id: string) => {
    await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
    // don't mutate store here; caller may refetch or update via setProjects/setItems
  };

  return {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
  };
};
