import { createError } from "h3";

/** Guard after Drizzle `.returning()` — throws 404 when no row. */
export function requireFirstRow<T>(
  rows: T[],
  message = "Record not found",
): T {
  const row = rows[0];
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: message });
  }
  return row;
}
