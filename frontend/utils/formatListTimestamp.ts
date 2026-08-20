/**
 * Format list Created/Updated timestamps — always Asia/Jakarta (WIB).
 * API should return `toLocalTime()` (`YYYY-MM-DD HH:mm:ss`); wall-clock values are
 * shown as-is to avoid double timezone conversion in the browser.
 */

const LIST_TS_WIB = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/;

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const WIB_LIST_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatListTimestamp(
  value: string | null | undefined,
): string {
  if (value == null || value === "") return "—";

  const raw = String(value).trim();
  if (!raw) return "—";

  const wall = LIST_TS_WIB.exec(raw);
  if (wall) {
    const day = Number(wall[3]);
    const month = Number(wall[2]);
    const year = wall[1];
    const hour = wall[4];
    const minute = wall[5];
    const monthLabel = MONTH_SHORT[month - 1] ?? wall[2];
    return `${String(day).padStart(2, "0")} ${monthLabel} ${year}, ${hour}:${minute}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw.replace("T", " ").slice(0, 16);
  }

  return WIB_LIST_FORMATTER.format(parsed);
}
