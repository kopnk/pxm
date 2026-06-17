import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";
import { apiFetch } from "~/utils/apiFetch";

export type ProjectFileItem = {
  id: string;
  refTable: string;
  refId: string;
  fileCategory: string;
  fileName?: string | null;
  fileUrl: string;
  signedUrl?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadedAt?: string | null;
};

const mapProjectFileItem = (row: Record<string, unknown>): ProjectFileItem => ({
  id: String(row.id ?? ""),
  refTable: String(row.refTable ?? row.ref_table ?? ""),
  refId: String(row.refId ?? row.ref_id ?? ""),
  fileCategory: String(row.fileCategory ?? row.file_category ?? ""),
  fileName: (row.fileName ?? row.file_name ?? null) as string | null,
  fileUrl: String(row.fileUrl ?? row.file_url ?? ""),
  signedUrl: (row.signedUrl ?? row.signed_url ?? null) as string | null,
  fileSize: (row.fileSize ?? row.file_size ?? null) as number | null,
  mimeType: (row.mimeType ?? row.mime_type ?? null) as string | null,
  uploadedAt: (row.uploadedAt ?? row.uploaded_at ?? null) as string | null,
});

/** URL-only record saved manually (GDrive, local path, etc.) — not Supabase upload. */
export const isExternalProjectFile = (file: ProjectFileItem) => {
  if (/supabase\.co\/storage/i.test(file.fileUrl || "")) return false;
  if (file.mimeType) return false;
  if (file.fileSize != null && Number(file.fileSize) > 0) return false;
  return Boolean(file.fileUrl?.trim());
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
        limit: params.limit ?? DEFAULT_PAGE_LIMIT,
      },
    });

    return ((res?.data?.items || []) as Record<string, unknown>[]).map(
      mapProjectFileItem,
    );
  };

  const uploadProjectFile = async (payload: {
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

  const createProjectFileByUrl = async (payload: {
    refTable: string;
    refId: string;
    fileCategory: string;
    externalUrl: string;
    fileName?: string;
  }) =>
    apiFetch("/api/project_files", {
      method: "POST",
      body: {
        refTable: payload.refTable,
        refId: payload.refId,
        fileCategory: payload.fileCategory,
        fileUrl: payload.externalUrl.trim(),
        fileName: payload.fileName?.trim() || undefined,
      },
    });
  const deleteProjectFile = (id: string) =>
    apiFetch(`/api/project_files/${id}`, {
      method: "DELETE",
    });

  return {
    getProjectFiles,
    uploadProjectFile,
    createProjectFileByUrl,
    deleteProjectFile,
  };
};
