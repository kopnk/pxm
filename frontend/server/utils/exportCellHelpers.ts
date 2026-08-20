export function cellStr(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v);
}

export function cellDate(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v).slice(0, 10);
}

export function cellNum(v: unknown): number | string {
  if (v == null || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}
