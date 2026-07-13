import { createError, defineEventHandler, readBody } from "h3";
import { logAudit } from "~/server/utils/audit";
import { requireRole } from "~/server/utils/authorize";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import { createProgressStageRecord } from "~/server/utils/progressStageStore";
import { successResponse } from "~/server/utils/response";
import { parseBody } from "~/server/utils/zod";
import { createProgressStageSchema } from "~/server/validation/progress_stage.schema";

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

  const created = await createProgressStageRecord({
    code: body.code,
    name: body.name,
    stageType: body.stageType,
    sequence: body.sequence,
    isRequired: body.isRequired ?? true,
    isActive: body.isActive ?? true,
    createdUser: userId,
    updatedUser: userId,
  });

  await logAudit({
    event,
    actorId: userId,
    action: "CREATE",
    targetTable: "progress_stage",
    targetId: created.id,
    newData: created,
  });

  return successResponse(
    event,
    "Progress stage created",
    mapLocalTimestamps(created),
    201,
  );
});
