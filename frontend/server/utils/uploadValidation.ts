import { createError } from "h3";

type UploadedPart = {
  data: Buffer;
  type?: string;
};

const FILE_SIGNATURES: Record<string, (data: Buffer) => boolean> = {
  "application/pdf": (data) => data.subarray(0, 5).toString("latin1") === "%PDF-",
  "image/png": (data) =>
    data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/jpeg": (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
  "image/webp": (data) =>
    data.subarray(0, 4).toString("latin1") === "RIFF" &&
    data.subarray(8, 12).toString("latin1") === "WEBP",
};

/** Storage extension is derived from the verified MIME type, never from the client file name. */
const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Validates size, declared MIME type and magic bytes of an uploaded part.
 * Returns the safe file extension to use in the storage key.
 */
export function assertUploadedFile(
  file: UploadedPart,
  options: { allowedTypes: readonly string[]; maxBytes: number },
): { mimeType: string; extension: string } {
  const maxMb = Math.round(options.maxBytes / (1024 * 1024));
  if (file.data.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "File is empty" });
  }

  if (file.data.length > options.maxBytes) {
    throw createError({ statusCode: 400, statusMessage: `File too large (max ${maxMb}MB)` });
  }

  const mimeType = (file.type || "").toLowerCase();
  if (!options.allowedTypes.includes(mimeType) || !MIME_EXTENSIONS[mimeType]) {
    throw createError({ statusCode: 400, statusMessage: "Invalid file type" });
  }

  if (!FILE_SIGNATURES[mimeType]?.(file.data)) {
    throw createError({
      statusCode: 400,
      statusMessage: "File content does not match file type",
    });
  }

  return { mimeType, extension: MIME_EXTENSIONS[mimeType]! };
}

/** Strips path segments and control characters from a client-provided file name. */
export function sanitizeDisplayFileName(name?: string | null): string | null {
  const base = (name ?? "").split(/[/\\]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>"]/g, "").trim().slice(0, 255);
  return cleaned || null;
}
