import { createError, defineEventHandler } from "h3";
import { logAudit } from "~/server/utils/audit";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { createHttpErrorFromUnknown } from "~/server/utils/httpError";
import { ensureProjectDeleteAllowed } from "~/server/utils/projectDeleteGuard";
import { deleteProjectRecord, getProjectRecordById } from "~/server/utils/projectStore";
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

  const oldData = await getProjectRecordById(id);
  if (!oldData) {
    throw createError({ statusCode: 404, statusMessage: "Project not found" });
  }

  try {
    await ensureProjectDeleteAllowed(id);
  } catch (error: unknown) {
    throw createHttpErrorFromUnknown(error, "Failed to delete project");
  }

  await deleteProjectRecord(id);

  await logAudit({
    event,
    actorId: userId,
    action: "DELETE",
    targetTable: "projects",
    targetId: id,
    oldData,
  });

  return successResponse(event, "Project deleted");
});
