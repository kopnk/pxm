import {
  fileKeyFromManagedUrl,
  toAppFileUrl,
  toManagedFileUrl,
} from "~/server/utils/appFilesStorage";

export const PROJECT_FILES_PREFIX = "project-files";

type ProjectFileRow = {
  fileUrl: string;
  [key: string]: unknown;
};

export function toProjectStorageUrl(path: string): string {
  return toManagedFileUrl(`${PROJECT_FILES_PREFIX}/${path.replace(/^\/+/, "")}`);
}

function projectFileKeyFromUrl(fileUrl: string) {
  const key = fileKeyFromManagedUrl(fileUrl);
  if (key?.startsWith(`${PROJECT_FILES_PREFIX}/`)) {
    return key;
  }

  return null;
}

export async function withProjectFileSignedUrls<T extends ProjectFileRow>(
  rows: T[],
): Promise<Array<T & { signedUrl?: string | null }>> {
  return rows.map((row) => {
    const key = projectFileKeyFromUrl(row.fileUrl);
    if (!key) return { ...row, signedUrl: null };

    return {
      ...row,
      signedUrl: toAppFileUrl(key),
    };
  });
}
