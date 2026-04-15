import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { projectProgress } from "~/server/db/schema/project_progress";

import { eq } from "drizzle-orm";

import { successResponse } from "~/server/utils/response";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { logAudit } from "~/server/utils/audit";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */

  const forbidden = requireDeleteSuperadmin(event);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  /* ================= PARAM ================= */

  const id = event.context.params?.id;

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  /* ================= TRANSACTION ================= */

  await db.transaction(async (tx) => {

    /* ===== GET OLD DATA ===== */

    const rows = await tx
      .select()
      .from(projectProgress)
      .where(eq(projectProgress.id, id))
      .limit(1);

    const oldData = rows[0];

    if (!oldData) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project progress not found",
      });
    }

    /* ===== DELETE ===== */

    await tx
      .delete(projectProgress)
      .where(eq(projectProgress.id, id));

    /* ===== AUDIT ===== */

    await logAudit({
      actorId: userId,
      action: "DELETE",
      targetTable: "project_progress",
      targetId: id,
      oldData,
    });

  });

  /* ================= RESPONSE ================= */

  return successResponse(event, "Project progress deleted");

});