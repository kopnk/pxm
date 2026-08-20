import { defineEventHandler, readBody, createError } from "h3";
import { parseBody } from "~/server/utils/zod";
import {
  updateProjectDetailSchema,
  type UpdateProjectDetailInput,
} from "~/server/validation/project_details.schema";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import {
  getProjectDetailRecordById,
  updateProjectDetailRecord,
} from "~/server/utils/projectDetailStore";

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
    updateProjectDetailSchema,
    await readBody(event),
  ) as UpdateProjectDetailInput;

  const oldData = await getProjectDetailRecordById(id);
  if (!oldData) {
    throw createError({ statusCode: 404, statusMessage: "Project detail not found" });
  }

  let updated;
  try {
    updated = await updateProjectDetailRecord(id, {
      projectId: body.projectId,
      cityKabId: body.cityKabId,
      systemkey: body.systemkey?.trim(),
      neId: body.neId?.trim() ?? body.neId,
      materialId: body.materialId,
      materialName: body.materialName,
      siteId: body.siteId,
      siteName: body.siteName,
      picArea: body.picArea,
      lineNumber: body.lineNumber,
      quantity: body.quantity,
      uom: body.uom,
      unitPrice: body.unitPrice,
      status: body.status ?? undefined,
      remarksProjectsDetails: body.remarksProjectsDetails,
      remarksDelay: body.remarksDelay,
      remarksCancel: body.remarksCancel,
      taxOut: body.taxOut,
      updatedUser: userId,
    });
  } catch (err: unknown) {
    const statusCode =
      typeof err === "object" &&
      err !== null &&
      "statusCode" in err &&
      typeof (err as { statusCode?: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : 500;

    throw createError({
      statusCode,
      statusMessage: err instanceof Error ? err.message : "Failed to update project detail",
    });
  }

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: "Project detail not found" });
  }

  await logAudit({
    event,
    actorId: userId,
    action: "UPDATE",
    targetTable: "project_details",
    targetId: id,
    oldData,
    newData: updated,
  });

  return successResponse(event, "Project detail updated", {
    ...updated,
    ...mapLocalTimestamps(updated),
  });
});
