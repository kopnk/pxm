type CompressOptions = {
  /** Longest edge in CSS pixels after resizing. */
  maxDimension: number;
  quality?: number;
};

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Downscales and re-encodes an image in the browser before upload so slow
 * mobile connections send a few hundred KB instead of a full camera photo.
 * Falls back to the original file whenever re-encoding would not help.
 */
export async function compressImageFile(
  file: File,
  { maxDimension, quality = 0.85 }: CompressOptions,
): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Safari < 17 cannot encode WebP; JPEG is the universal fallback.
  let blob = await canvasToBlob(canvas, "image/webp", quality);
  if (!blob || blob.type !== "image/webp") {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  if (!blob || blob.size >= file.size) return file;

  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${extension}`, { type: blob.type });
}
