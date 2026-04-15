import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { progressStage } from "~/server/db/schema/progress_stage";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { logAudit } from "~/server/utils/audit";

export default defineEventHandler(async (event) => {

  const forbidden = requireDeleteSuperadmin(event);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  await db.transaction(async (tx) => {

    const rows = await tx
      .select()
      .from(progressStage)
      .where(eq(progressStage.id, id))
      .limit(1);

    const oldData = rows[0];

    if (!oldData) {
      throw createError({ statusCode: 404, statusMessage: "Progress stage not found" });
    }

    await tx.delete(progressStage).where(eq(progressStage.id, id));

    await logAudit({
      actorId: userId,
      action: "DELETE",
      targetTable: "progress_stage",
      targetId: id,
      oldData,
    });
  });

  return successResponse(event, "Progress stage deleted");
});
