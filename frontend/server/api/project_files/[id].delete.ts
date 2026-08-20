import { defineEventHandler, createError } from "h3";
import { crudActionMessage } from "~/lib/entityMessages";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { successResponse } from "~/server/utils/response";
import { logAudit } from "~/server/utils/audit";
import {
  getProjectFileRecordById,
  updateProjectFileRecord,
} from "~/server/utils/projectFileStore";

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

  const oldData = await getProjectFileRecordById(id);
  if (!oldData || oldData.deletedAt) {
    throw createError({ statusCode: 404, statusMessage: "File not found" });
  }

  const updated = await updateProjectFileRecord(id, {
    deletedAt: new Date().toISOString(),
    deletedBy: userId,
  });

  await logAudit({
    event,
    actorId: userId,
    action: "DELETE",
    targetTable: "project_files",
    targetId: id,
    oldData,
    newData: updated,
  });

  return successResponse(event, crudActionMessage("document", "deleted"));
});
