import { createError, defineEventHandler } from "h3";
import { logAudit } from "~/server/utils/audit";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import {
  deleteProgressStageRecord,
  getProgressStageRecordById,
} from "~/server/utils/progressStageStore";
import { successResponse } from "~/server/utils/response";

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

  const oldData = await getProgressStageRecordById(id);
  if (!oldData) {
    throw createError({ statusCode: 404, statusMessage: "Progress stage not found" });
  }

  await deleteProgressStageRecord(id);

  await logAudit({
    event,
    actorId: userId,
    action: "DELETE",
    targetTable: "progress_stage",
    targetId: id,
    oldData,
  });

  return successResponse(event, "Progress stage deleted");
});
