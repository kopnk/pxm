import { ilike, or, sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

/** Pola ILIKE untuk search box (termasuk varian angka tanpa pemisah ribuan). */
export function patternsForSearch(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];

  const variants = new Set<string>([t]);
  const noSeparators = t.replace(/[.,\s]/g, "");
  if (noSeparators.length > 0) variants.add(noSeparators);

  return [...variants].map((v) => `%${v}%`);
}

type SearchOrConfig = {
  /** Kolom text — ILIKE langsung. */
  ilike?: AnyColumn[];
  /** Kolom numeric / date / jsonb / integer — cast ke text dulu. */
  asText?: AnyColumn[];
};

/**
 * OR clause untuk kotak search: teks + angka/nilai (amount, qty, rate, dll.).
 */
export function buildSearchOr(
  search: string,
  config: SearchOrConfig,
): SQL | undefined {
  const patterns = patternsForSearch(search);
  if (!patterns.length) return undefined;

  const parts: SQL[] = [];

  for (const pattern of patterns) {
    for (const col of config.ilike ?? []) {
      parts.push(ilike(col, pattern));
    }
    for (const col of config.asText ?? []) {
      parts.push(sql`${col}::text ILIKE ${pattern}`);
    }
  }

  if (!parts.length) return undefined;
  return or(...parts);
}
