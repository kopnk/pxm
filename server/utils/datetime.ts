const DEFAULT_TZ = "Asia/Jakarta";

function parseInput(date: Date | string): Date | null {
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pick(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
) {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/** Format instant → `YYYY-MM-DD HH:mm:ss` in Asia/Jakarta (Intl, server-safe for Nitro/VPS). */
export function toLocalTime(date?: Date | string | null) {
  if (!date) return null;
  const d = parseInput(date);
  if (!d) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  return `${pick(parts, "year")}-${pick(parts, "month")}-${pick(parts, "day")} ${pick(parts, "hour")}:${pick(parts, "minute")}:${pick(parts, "second")}`;
}

/** Format instant → `YYYY-MM-DD` in Asia/Jakarta. */
export function toLocalDate(date?: Date | string | null) {
  if (!date) return null;
  const d = parseInput(date);
  if (!d) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  return `${pick(parts, "year")}-${pick(parts, "month")}-${pick(parts, "day")}`;
}
