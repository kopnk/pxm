/** Nilai numeric Drizzle PG: simpan sebagai string di DB. */

export function numToPgString(
  v: number | null | undefined,
  scale = 4,
): string | null {
  if (v === undefined || v === null || Number.isNaN(v)) return null;
  if (!Number.isFinite(v)) return null;
  return v.toFixed(scale);
}

/** Partial update: undefined = pertahankan nilai lama. */
export function mergePgNumeric(
  bodyVal: number | null | undefined,
  previous: string | null,
  scale = 4,
): string | null {
  if (bodyVal === undefined) return previous;
  if (bodyVal === null || Number.isNaN(bodyVal)) return null;
  if (!Number.isFinite(bodyVal)) return null;
  return bodyVal.toFixed(scale);
}
