import { createError, defineEventHandler, readBody } from "h3";
import { logAudit } from "~/server/utils/audit";
import { requireRole } from "~/server/utils/authorize";
import {
  createProjectProgressRecord,
  getProjectProgressListItemById,
} from "~/server/utils/projectProgressStore";
import { mapProjectProgressResponse } from "~/server/utils/projectProgressResponse";
import { validateStageDataKeys } from "~/server/utils/progressStageValidation";
import { successResponse } from "~/server/utils/response";
import { parseBody } from "~/server/utils/zod";
import { createProjectProgressSchema } from "~/server/validation/project_progress.schema";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = parseBody(
    createProjectProgressSchema,
    await readBody(event),
  );
  await validateStageDataKeys(body.stageData);

  const created = await createProjectProgressRecord({
    projectId: body.projectId,
    projectDetailId: body.projectDetailId,
    stageData: body.stageData,
    remarksProjectsDetails: body.remarksProjectsDetails,
    remarksDelay: body.remarksDelay,
    remarksCancel: body.remarksCancel,
    createdUser: userId,
    updatedUser: userId,
  });

  await logAudit({
    event,
    actorId: userId,
    action: "CREATE",
    targetTable: "project_progress",
    targetId: created.id,
    newData: created,
  });

  const createdItem = await getProjectProgressListItemById(created.id);

  return successResponse(
    event,
    "Project progress created",
    mapProjectProgressResponse(createdItem ?? created),
    201,
  );
});
