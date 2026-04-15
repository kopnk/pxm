import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { progressStage } from "~/server/db/schema/progress_stage";
import { eq } from "drizzle-orm";
import { parseBody } from "~/server/utils/zod";
import { updateProgressStageSchema } from "~/server/validation/progress_stage.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const body = parseBody(
    updateProgressStageSchema,
    await readBody(event)
  );

  const updated = await db.transaction(async (tx) => {

    const oldRows = await tx
      .select()
      .from(progressStage)
      .where(eq(progressStage.id, id))
      .limit(1);

    const oldData = oldRows[0];

    if (!oldData) {
      throw createError({ statusCode: 404, statusMessage: "Progress stage not found" });
    }

    const rows = await tx
      .update(progressStage)
      .set({
        code: body.code ?? oldData.code,
        name: body.name ?? oldData.name,
        stageType: body.stageType ?? oldData.stageType,
        sequence: body.sequence ?? oldData.sequence,
        isRequired: body.isRequired ?? oldData.isRequired,
        isActive: body.isActive ?? oldData.isActive,
        updatedAt: dbTime(),
      })
      .where(eq(progressStage.id, id))
      .returning();

    const row = rows[0];

    await logAudit({
      actorId: userId,
      action: "UPDATE",
      targetTable: "progress_stage",
      targetId: id,
      oldData,
      newData: row,
    });

    return row;
  });

  return successResponse(event, "Progress stage updated", updated);
});
