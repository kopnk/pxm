import { apiFetch } from "~/utils/apiFetch";

export type ProjectFileItem = {
  id: string;
  refTable: string;
  refId: string;
  fileCategory: string;
  fileName?: string | null;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadedAt?: string | null;
};

export const useProjectFilesApi = () => {
  const getProjectFiles = async (params: {
    refTable: string;
    refId: string;
    fileCategory?: string;
    page?: number;
    limit?: number;
  }) => {
    const res: any = await apiFetch("/api/project_files", {
      query: {
        refTable: params.refTable,
        refId: params.refId,
        fileCategory: params.fileCategory || undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    });

    return (res?.data?.items || []) as ProjectFileItem[];
  };

  const uploadProjectFile = async(payload: {
    refTable: string;
    refId: string;
    fileCategory: string;
    file: File;
  }) => {
    const formData = new FormData();
    formData.append("refTable", payload.refTable);
    formData.append("refId", payload.refId);
    formData.append("fileCategory", payload.fileCategory);
    formData.append("file", payload.file);

    return apiFetch("/api/project_files", {
      method: "POST",
      body: formData,
    });
  };

  const deleteProjectFile = (id: string) =>
    apiFetch(`/api/project_files/${id}`, {
      method: "DELETE",
    });

  return {
    getProjectFiles,
    uploadProjectFile,
    deleteProjectFile,
  };
};
