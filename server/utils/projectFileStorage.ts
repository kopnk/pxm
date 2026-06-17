import { supabase } from "~/server/utils/supabase";

export const PROJECT_FILES_BUCKET = "project-files";
const STORAGE_URL_PREFIX = `supabase://${PROJECT_FILES_BUCKET}/`;
const SIGNED_URL_EXPIRES_IN = 10 * 60;

type ProjectFileRow = {
  fileUrl: string;
  [key: string]: unknown;
};

export function toProjectStorageUrl(path: string): string {
  return `${STORAGE_URL_PREFIX}${path}`;
}

function storagePathFromUrl(fileUrl: string): string | null {
  if (fileUrl.startsWith(STORAGE_URL_PREFIX)) {
    return fileUrl.slice(STORAGE_URL_PREFIX.length);
  }

  const marker = `/storage/v1/object/public/${PROJECT_FILES_BUCKET}/`;
  const markerIndex = fileUrl.indexOf(marker);
  if (markerIndex >= 0) {
    return fileUrl.slice(markerIndex + marker.length);
  }

  return null;
}

export async function withProjectFileSignedUrls<T extends ProjectFileRow>(
  rows: T[],
): Promise<Array<T & { signedUrl?: string | null }>> {
  return Promise.all(
    rows.map(async (row) => {
      const path = storagePathFromUrl(row.fileUrl);
      if (!path) return { ...row, signedUrl: null };

      const { data, error } = await supabase.storage
        .from(PROJECT_FILES_BUCKET)
        .createSignedUrl(path, SIGNED_URL_EXPIRES_IN);

      return {
        ...row,
        signedUrl: error ? null : data.signedUrl,
      };
    }),
  );
}
