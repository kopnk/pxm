/**
 * Logika angka project financials (tanpa Vue). Dipakai composables + Nitro server.
 * File di `lib/` (bukan `utils/`) supaya tidak bentrok auto-import Nuxt dari folder `utils/`.
 */

/** Nilai rupiah dari % terhadap base (4 desimal, selaras kolom numeric tax di DB) */
export function pfAmountFromPercent(
  base: number | null,
  percent: number | null | undefined,
): number | null {
  if (base == null || base <= 0) return null;
  if (percent == null) return null;
  const p = Number(percent);
  if (!Number.isFinite(p)) return null;
  return Math.round((base * p) / 100 * 1e4) / 1e4;
}

export function pfParseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Qty × price — dasar pajak & total baris (sama dengan `pfPartnerLineTotal` / `pfClientLineTotal`).
 */
export function pfListLineBase(qty: unknown, unitPrice: unknown): number | null {
  const q = pfParseNum(qty);
  const u = pfParseNum(unitPrice);
  if (q === null || u === null) return null;
  const b = q * u;
  return Number.isFinite(b) ? b : null;
}

/** Rupiah dari komponen pajak mitra: persen × (qty_partner × unit_price_partner). */
export function pfPartnerTaxRupiahForDisplay(
  qty: unknown,
  unitPrice: unknown,
  dbValue: unknown,
): number | null {
  const base = pfListLineBase(qty, unitPrice);
  const raw = pfParseNum(dbValue);
  if (raw === null) return null;
  if (base === null) return null;

  if (raw > 100) {
    return raw;
  }

  if (base <= 0) {
    return null;
  }

  return pfAmountFromPercent(base, raw) ?? raw;
}

/** Rupiah tax out klien: persen × (qty_client × unit_price_client). */
export function pfClientTaxRupiahForDisplay(
  qty: unknown,
  unitPrice: unknown,
  dbValue: unknown,
): number | null {
  return pfPartnerTaxRupiahForDisplay(qty, unitPrice, dbValue);
}

export function pfPartnerLineTotal(
  qty: unknown,
  unitPrice: unknown,
  pph: unknown,
  taxIn: unknown,
): number | null {
  const base = pfListLineBase(qty, unitPrice);
  if (base === null) return null;
  const p = pfPartnerTaxRupiahForDisplay(qty, unitPrice, pph) ?? 0;
  const t = pfPartnerTaxRupiahForDisplay(qty, unitPrice, taxIn) ?? 0;
  return base - p + t;
}

export function pfClientLineTotal(
  qty: unknown,
  unitPrice: unknown,
  taxOut: unknown,
): number | null {
  const base = pfListLineBase(qty, unitPrice);
  if (base === null) return null;
  const t = pfClientTaxRupiahForDisplay(qty, unitPrice, taxOut) ?? 0;
  return base + t;
}

export function pfFormatIdDate(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  const s = String(v);
  if (s.length >= 10) return s.slice(0, 10);
  return s;
}
