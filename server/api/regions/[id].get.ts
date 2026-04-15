import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { regions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { regionIdSchema } from "~/server/validation/regions.schema";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  /* ================= PARAM VALIDATION ================= */
  const { id } = regionIdSchema.parse(event.context.params);

  /* ================= QUERY ================= */
  const rows = await db
    .select()
    .from(regions)
    .where(eq(regions.id, id))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Region not found" });
  }

  return successResponse(event, "Region retrieved", {
    ...row,
    createdAt: row.createdAt ? toLocalTime(row.createdAt) : null,
  });
});
