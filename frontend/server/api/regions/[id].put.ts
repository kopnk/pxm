import { defineEventHandler, readBody, createError } from "h3";
import { parseBody } from "~/server/utils/zod";
import {
  createRegionSchema,
  updateRegionSchema,
  regionIdSchema,
} from "~/server/validation/regions.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import {
  getRegionRecordById,
  updateRegionRecord,
} from "~/server/utils/regionStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { id } = regionIdSchema.parse(event.context.params);
  const body = parseBody(updateRegionSchema, await readBody(event));
  const oldData = await getRegionRecordById(id);

  if (!oldData) {
    throw createError({
      statusCode: 404,
      statusMessage: "Region not found",
    });
  }

  const nextType = body.type ?? oldData.type;
  const nextParentId =
    body.parentId !== undefined
      ? body.parentId
      : nextType === "region"
        ? null
        : oldData.parentId;

  createRegionSchema.parse({
    name: body.name ?? oldData.name,
    type: nextType,
    parentId: nextParentId,
  });

  const updated = await updateRegionRecord(id, {
    name: body.name ?? oldData.name,
    type: nextType,
    parentId: nextParentId,
    updatedUser: userId,
  });

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: "Region not found",
    });
  }

  await logAudit({
    event,
    actorId: userId,
    action: "UPDATE",
    targetTable: "regions",
    targetId: id,
    oldData,
    newData: updated,
  });

  return successResponse(event, "Region updated", mapLocalTimestamps(updated));
});
