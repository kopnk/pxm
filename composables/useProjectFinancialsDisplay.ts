import { pfAmountFromPercent } from "@/composables/useProjectFinancialForm";

/**
 * Format angka & total baris untuk tampilan list / form project financials.
 * Mitra: (qty × harga) − PPH + Tax in
 * Klien: (qty × harga) + Tax out
 *
 * Kolom DB `pph` / `tax_in` / `tax_out` = PERSEN terhadap dasar baris
 * (qty × harga partner atau qty × harga klien): 2 = 2%, 11 = 11%.
 * Rupiah tampilan = qty × price × (persen / 100).
 * Jika nilai > 100, dianggap nominal rupiah lama (sebelum kolom diseragamkan ke %).
 *
 * Dasar baris di sini SAMA dengan yang dipakai Total (qty × harga), bukan
 * `pfPartnerLineBase` form (yang mensyaratkan hasil kali > 0).
 */
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
