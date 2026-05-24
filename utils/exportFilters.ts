/** Normalisasi status filter untuk export API (selaras dengan Zod server). */

export const PROJECT_STATUSES = ["active", "closed", "cancelled"] as const;

export function normalizeProjectStatus(
  s: string,
): (typeof PROJECT_STATUSES)[number] | undefined {
  const t = s.trim();
  return (PROJECT_STATUSES as readonly string[]).includes(t)
    ? (t as (typeof PROJECT_STATUSES)[number])
    : undefined;
}

export const PROJECT_DETAIL_STATUSES = [
  "active",
  "delay",
  "closed",
  "cancelled",
] as const;

export function normalizeProjectDetailStatus(
  s: string,
): (typeof PROJECT_DETAIL_STATUSES)[number] | undefined {
  const t = s.trim();
  return (PROJECT_DETAIL_STATUSES as readonly string[]).includes(t)
    ? (t as (typeof PROJECT_DETAIL_STATUSES)[number])
    : undefined;
}

export const FINANCIAL_STATUSES = [
  "draft",
  "issued",
  "approved",
  "paid",
  "cancelled",
] as const;

export function normalizeFinancialStatus(
  s: string,
): (typeof FINANCIAL_STATUSES)[number] | undefined {
  const t = s.trim();
  return (FINANCIAL_STATUSES as readonly string[]).includes(t)
    ? (t as (typeof FINANCIAL_STATUSES)[number])
    : undefined;
}
