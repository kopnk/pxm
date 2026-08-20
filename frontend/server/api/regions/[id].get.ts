import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { regionIdSchema } from "~/server/validation/regions.schema";
import { toLocalTime } from "~/server/utils/datetime";
import { getRegionRecordById } from "~/server/utils/regionStore";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  /* ================= PARAM VALIDATION ================= */
  const { id } = regionIdSchema.parse(event.context.params);

  /* ================= QUERY ================= */
  const row = await getRegionRecordById(id);

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Region not found" });
  }

  return successResponse(event, "Region retrieved", {
    ...row,
    createdAt: row.createdAt ? toLocalTime(row.createdAt) : null,
  });
});
