import { createError, defineEventHandler } from "h3";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { logAudit } from "~/server/utils/audit";
import { createHttpErrorFromUnknown } from "~/server/utils/httpError";
import { ensureProjectDetailDeleteAllowed } from "~/server/utils/projectDeleteGuard";
import {
  deleteProjectDetailRecord,
  getProjectDetailRecordById,
} from "~/server/utils/projectDetailStore";
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

  const oldData = await getProjectDetailRecordById(id);
  if (!oldData) {
    throw createError({ statusCode: 404, statusMessage: "Project detail not found" });
  }

  try {
    await ensureProjectDetailDeleteAllowed(id);
  } catch (error: unknown) {
    throw createHttpErrorFromUnknown(error, "Failed to delete project detail");
  }

  await deleteProjectDetailRecord(id);

  await logAudit({
    event,
    actorId: userId,
    action: "DELETE",
    targetTable: "project_details",
    targetId: id,
    oldData,
  });

  return successResponse(event, "Project detail deleted");
});
