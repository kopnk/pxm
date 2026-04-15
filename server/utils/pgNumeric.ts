/** Nilai numeric Drizzle PG: simpan sebagai string di DB. */

export function numToPgString(
  v: number | null | undefined,
): string | null {
  if (v === undefined || v === null || Number.isNaN(v)) return null;
  return String(v);
}

/** Partial update: undefined = pertahankan nilai lama. */
export function mergePgNumeric(
  bodyVal: number | null | undefined,
  previous: string | null,
): string | null {
  if (bodyVal === undefined) return previous;
  if (bodyVal === null || Number.isNaN(bodyVal)) return null;
  return String(bodyVal);
}
