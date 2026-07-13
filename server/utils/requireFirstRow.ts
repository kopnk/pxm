import { createError } from "h3";

/** Guard for create/update result arrays — throws 404 when no row is returned. */
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
