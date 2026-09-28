import type { QueryValue } from "ufo";

/** Ambil satu nilai query string dari H3 `getQuery` (trim, kosong -> undefined). */
export function firstQuery(
  v: QueryValue | QueryValue[] | undefined,
): string | undefined {
  if (v == null) return undefined;

  const first = Array.isArray(v) ? v[0] : v;
  const text = String(first).trim();

  return text === "" ? undefined : text;
}

/** Cocokkan filter teks secara tidak peka huruf besar/kecil. */
export function matchesStoredTextOption(value: string | null | undefined, selected?: string) {
  const filter = selected?.trim();
  return !filter || String(value ?? "").trim().toLocaleLowerCase("id-ID") === filter.toLocaleLowerCase("id-ID");
}

/** Material names used across project detail, progress, and financial filters. */
export const PROJECT_DETAIL_MATERIAL_NAMES = [
  "Services",
  "Supply",
  "Supply & Services",
] as const;

function normalizeMaterialName(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLocaleLowerCase("id-ID");
  return normalized === "service" ? "services" : normalized;
}

/** Matches the standard material options and keeps legacy `Service` data under `Services`. */
export function matchesMaterialName(value: string | null | undefined, selected?: string) {
  const filter = selected?.trim();
  return !filter || normalizeMaterialName(value) === normalizeMaterialName(filter);
}
