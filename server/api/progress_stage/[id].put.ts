import { createError, defineEventHandler, readBody } from "h3";
import { logAudit } from "~/server/utils/audit";
import { requireRole } from "~/server/utils/authorize";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import {
  getProgressStageRecordById,
  updateProgressStageRecord,
} from "~/server/utils/progressStageStore";
import { successResponse } from "~/server/utils/response";
import { parseBody } from "~/server/utils/zod";
import { updateProgressStageSchema } from "~/server/validation/progress_stage.schema";

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

  const oldData = await getProgressStageRecordById(id);
  if (!oldData) {
    throw createError({ statusCode: 404, statusMessage: "Progress stage not found" });
  }

  const updated = await updateProgressStageRecord(id, {
    ...body,
    updatedUser: userId,
  });
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: "Progress stage not found" });
  }

  await logAudit({
    event,
    actorId: userId,
    action: "UPDATE",
    targetTable: "progress_stage",
    targetId: id,
    oldData,
    newData: updated,
  });

  return successResponse(
    event,
    "Progress stage updated",
    mapLocalTimestamps(updated),
  );
});
