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
