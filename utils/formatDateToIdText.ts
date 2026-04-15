const ID_DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});
const ID_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  timeZone: "Asia/Jakarta",
});

function parseIsoDateOnly(input: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  // Keep date stable across timezones for date-only values.
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateToIdText(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;

  const raw = String(value).trim();
  if (!raw) return fallback;

  const isoDateOnly = parseIsoDateOnly(raw);
  if (isoDateOnly) return ID_DATE_FORMATTER.format(isoDateOnly);

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return ID_DATE_FORMATTER.format(parsed);
}

export function formatDateToIdWeekday(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;

  const raw = String(value).trim();
  if (!raw) return fallback;

  const isoDateOnly = parseIsoDateOnly(raw);
  if (isoDateOnly) return ID_WEEKDAY_FORMATTER.format(isoDateOnly);

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return ID_WEEKDAY_FORMATTER.format(parsed);
}
