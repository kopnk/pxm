import { apiFetch } from "~/utils/apiFetch";

export const useProgressStageApi = () => {

  /* ================= GET LIST ================= */
  const getProgressStages = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    stageType?: string;
    isActive?: boolean;
  }) => {
    return await apiFetch("/api/progress_stage", {
      query: params,
    });
  };

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

  return {
    getProgressStages,
    createProgressStage,
  };
};