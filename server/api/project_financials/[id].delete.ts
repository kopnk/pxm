import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { logAudit } from "~/server/utils/audit";
import {
  listProjectFileRecords,
  updateProjectFileRecord,
} from "~/server/utils/projectFileStore";
import {
  deleteProjectFinancialRecord,
  getProjectFinancialRecordById,
} from "~/server/utils/projectFinancialStore";

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

  const oldData = await getProjectFinancialRecordById(id);
  if (!oldData) {
    throw createError({ statusCode: 404, statusMessage: "Project financial not found" });
  }

  const relatedFiles = await listProjectFileRecords({
    refTable: "project_financials",
    refId: id,
  });

  for (const file of relatedFiles) {
    const updatedFile = await updateProjectFileRecord(file.id, {
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
    });

    await logAudit({
      event,
      actorId: userId,
      action: "DELETE",
      targetTable: "project_files",
      targetId: file.id,
      oldData: file,
      newData: updatedFile,
    });
  }

  await deleteProjectFinancialRecord(id);

  await logAudit({
    event,
    actorId: userId,
    action: "DELETE",
    targetTable: "project_financials",
    targetId: id,
    oldData,
  });

  return successResponse(event, "Project financial deleted");
});
