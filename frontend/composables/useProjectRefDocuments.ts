import { reactive } from "vue";

export type RefDocFiles = Record<string, File | null>;
export type RefDocUrls = Record<string, string>;

export const PROJECT_FILE_REF_TABLE = {
  FINANCIALS: "project_financials",
  PROGRESS: "project_progress",
  PROJECTS: "projects",
} as const;

type ProjectFilesApi = {
  uploadProjectFile: (payload: {
    refTable: string;
    refId: string;
    fileCategory: string;
    file: File;
  }) => Promise<unknown>;
  createProjectFileByUrl: (payload: {
    refTable: string;
    refId: string;
    fileCategory: string;
    externalUrl: string;
  }) => Promise<unknown>;
};

export const readFileFromInput = (event: Event): File | null =>
  (event.target as HTMLInputElement | null)?.files?.[0] ?? null;

export const hasPendingRefDocuments = (
  files: RefDocFiles,
  urls: RefDocUrls,
) =>
  Object.values(files).some(Boolean) ||
  Object.values(urls).some((url) => url.trim().length > 0);

export const ensureRefDocSlots = (
  files: RefDocFiles,
  urls: RefDocUrls,
  categories: string[],
) => {
  for (const code of categories) {
    if (!(code in files)) files[code] = null;
    if (!(code in urls)) urls[code] = "";
  }
};

export const resetRefDocFields = (
  files: RefDocFiles,
  urls: RefDocUrls,
  categories: string[],
) => {
  ensureRefDocSlots(files, urls, categories);
  for (const code of categories) {
    files[code] = null;
    urls[code] = "";
  }
};

export async function saveRefDocuments(
  api: ProjectFilesApi,
  refTable: string,
  refId: string,
  files: RefDocFiles,
  urls: RefDocUrls,
) {
  for (const [fileCategory, file] of Object.entries(files)) {
    if (!file) continue;

    await api.uploadProjectFile({
      refTable,
      refId,
      fileCategory,
      file,
    });
  }

  for (const [fileCategory, url] of Object.entries(urls)) {
    const trimmed = url?.trim();
    if (!trimmed) continue;

    await api.createProjectFileByUrl({
      refTable,
      refId,
      fileCategory,
      externalUrl: trimmed,
    });
  }
}

export function useRefDocumentFields(getCategories: () => string[]) {
  const files = reactive<RefDocFiles>({});
  const urls = reactive<RefDocUrls>({});

  const syncSlots = () => ensureRefDocSlots(files, urls, getCategories());
  const setUrl = (code: string, value: string) => {
    urls[code] = value;
  };
  const setFileFromEvent = (code: string, event: Event) => {
    files[code] = readFileFromInput(event);
  };
  const reset = () => resetRefDocFields(files, urls, getCategories());
  const hasPending = () => hasPendingRefDocuments(files, urls);

  return {
    files,
    urls,
    syncSlots,
    setUrl,
    setFileFromEvent,
    reset,
    hasPending,
  };
}
