import { createError, defineEventHandler } from "h3";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { logAudit } from "~/server/utils/audit";
import { createHttpErrorFromUnknown } from "~/server/utils/httpError";
import { ensureProjectProgressDeleteAllowed } from "~/server/utils/projectDeleteGuard";
import {
  deleteProjectProgressRecord,
  getProjectProgressRecordById,
} from "~/server/utils/projectProgressStore";
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

  const oldData = await getProjectProgressRecordById(id);
  if (!oldData) {
    throw createError({ statusCode: 404, statusMessage: "Project progress not found" });
  }

  try {
    await ensureProjectProgressDeleteAllowed(id);
  } catch (error: unknown) {
    throw createHttpErrorFromUnknown(error, "Failed to delete project progress");
  }

  await deleteProjectProgressRecord(id);

  await logAudit({
    event,
    actorId: userId,
    action: "DELETE",
    targetTable: "project_progress",
    targetId: id,
    oldData,
  });

  return successResponse(event, "Project progress deleted");
});
