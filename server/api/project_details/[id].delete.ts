import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { projectDetails } from "~/server/db/schema/project_details";
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
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  /* ================= PARAM ================= */
  const id = event.context.params?.id;
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid ID",
    });
  }

  const deleted = await db.transaction(async (tx) => {
    /* ---------- GET OLD DATA FIRST ---------- */
    const oldRows = await tx
      .select()
      .from(projectDetails)
      .where(eq(projectDetails.id, id))
      .limit(1);

    const oldData = oldRows[0];
    if (!oldData) return null;

    /* ---------- DELETE ---------- */
    await tx
      .delete(projectDetails)
      .where(eq(projectDetails.id, id));

    /* ---------- AUDIT ---------- */
    await logAudit({
      actorId: userId,
      action: "DELETE",
      targetTable: "project_details",
      targetId: id,
      oldData,
    });

    return oldData;
  });

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project detail not found",
    });
  }

  return successResponse(
    event,
    "Project detail deleted"
  );
});