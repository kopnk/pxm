import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { progressStage } from "~/server/db/schema/progress_stage";
import { parseBody } from "~/server/utils/zod";
import { createProgressStageSchema } from "~/server/validation/progress_stage.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = parseBody(
    createProgressStageSchema,
    await readBody(event)
  );

  const created = await db.transaction(async (tx) => {

    const rows = await tx
      .insert(progressStage)
      .values({
        code: body.code,
        name: body.name,
        stageType: body.stageType,
        sequence: body.sequence,
        isRequired: body.isRequired ?? true,
        isActive: body.isActive ?? true,
        createdUser: userId,
      })
      .returning();

    const row = rows[0];

    await logAudit({
      actorId: userId,
      action: "CREATE",
      targetTable: "progress_stage",
      targetId: row.id,
      newData: row,
    });

    return row;
  });

  return successResponse(event, "Progress stage created", created, 201);
});
