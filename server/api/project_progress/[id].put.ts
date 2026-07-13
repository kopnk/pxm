import { createError, defineEventHandler, readBody } from "h3";
import { logAudit } from "~/server/utils/audit";
import { requireRole } from "~/server/utils/authorize";
import { mapProjectProgressResponse } from "~/server/utils/projectProgressResponse";
import {
  getProjectProgressListItemById,
  getProjectProgressRecordById,
  updateProjectProgressRecord,
} from "~/server/utils/projectProgressStore";
import { validateStageDataKeys } from "~/server/utils/progressStageValidation";
import { successResponse } from "~/server/utils/response";
import { parseBody } from "~/server/utils/zod";
import { updateProjectProgressSchema } from "~/server/validation/project_progress.schema";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
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
    updateProjectProgressSchema,
    await readBody(event),
  );
  await validateStageDataKeys(body.stageData);

  const oldData = await getProjectProgressRecordById(id);
  if (!oldData) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project progress not found",
    });
  }

  const updated = await updateProjectProgressRecord(id, {
    projectId: body.projectId,
    projectDetailId: body.projectDetailId,
    stageData: body.stageData,
    remarksProjectsDetails: body.remarksProjectsDetails,
    remarksDelay: body.remarksDelay,
    remarksCancel: body.remarksCancel,
    updatedUser: userId,
  });
  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project progress not found",
    });
  }

  await logAudit({
    event,
    actorId: userId,
    action: "UPDATE",
    targetTable: "project_progress",
    targetId: id,
    oldData,
    newData: updated,
  });

  const updatedItem = await getProjectProgressListItemById(id);

  return successResponse(
    event,
    "Project progress updated",
    mapProjectProgressResponse(updatedItem ?? updated),
  );
});
