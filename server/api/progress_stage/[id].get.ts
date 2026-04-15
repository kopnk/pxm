import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { progressStage } from "~/server/db/schema/progress_stage";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const rows = await db
    .select()
    .from(progressStage)
    .where(eq(progressStage.id, id))
    .limit(1);

  const data = rows[0];

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Progress stage not found" });
  }

  return successResponse(event, "Progress stage retrieved", data);
});
