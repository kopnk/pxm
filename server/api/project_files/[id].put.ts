import { defineEventHandler, readBody, createError } from "h3";
import { parseBody } from "~/server/utils/zod";
import { updateProjectFileSchema } from "~/server/validation/project_files.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { withProjectFileSignedUrls } from "~/server/utils/projectFileStorage";
import {
  getProjectFileRecordById,
  updateProjectFileRecord,
} from "~/server/utils/projectFileStore";

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

  const body = parseBody(updateProjectFileSchema, await readBody(event));

  const oldData = await getProjectFileRecordById(id);
  if (!oldData || oldData.deletedAt) {
    throw createError({ statusCode: 404, statusMessage: "File not found" });
  }

  const updated = await updateProjectFileRecord(id, {
    fileCategory: body.fileCategory ?? oldData.fileCategory,
    fileName: body.fileName ?? oldData.fileName,
    version: body.version ?? oldData.version,
    isArchived: body.isArchived ?? oldData.isArchived,
  });

  if (!updated) {
    throw createError({ statusCode: 500, statusMessage: "Update failed" });
  }

  await logAudit({
    event,
    actorId: userId,
    action: "UPDATE",
    targetTable: "project_files",
    targetId: id,
    oldData,
    newData: updated,
  });

  const [signedFile] = await withProjectFileSignedUrls([updated]);
  return successResponse(event, "Document updated", signedFile);
});
