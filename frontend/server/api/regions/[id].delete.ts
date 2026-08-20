import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { regionIdSchema } from "~/server/validation/regions.schema";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import {
  deleteRegionRecordCascade,
  getRegionCascadeIds,
  listRegionRecords,
} from "~/server/utils/regionStore";
import { listProjectDetailRegionUsage } from "~/server/utils/projectDetailStore";
import { listProjectProgressUsageByDetailIds } from "~/server/utils/projectProgressStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { id } = regionIdSchema.parse(event.context.params);
  const cascade = await getRegionCascadeIds(id);

  if (!cascade) {
    throw createError({ statusCode: 404, statusMessage: "Region not found" });
  }

  const cascadeIdSet = new Set(cascade.ids);
  const cascadeRecords = (await listRegionRecords()).filter((record) =>
    cascadeIdSet.has(record.id),
  );
  const cityKabIds = cascadeRecords
    .filter((record) => record.type === "city_kab")
    .map((record) => record.id);
  const projectDetails = await listProjectDetailRegionUsage(cityKabIds);
  const projectProgress = await listProjectProgressUsageByDetailIds(
    projectDetails.map((detail) => detail.id),
  );

  if (projectDetails.length || projectProgress.length) {
    throw createError({
      statusCode: 409,
      statusMessage:
        "Region cannot be deleted because it is used by project detail or project progress data",
      data: {
        projectDetailCount: projectDetails.length,
        projectProgressCount: projectProgress.length,
      },
    });
  }

  const result = await deleteRegionRecordCascade(id);
  const deleted = result?.deleted ?? cascade.target;

  await logAudit({
    event,
    actorId: userId,
    action: "DELETE",
    targetTable: "regions",
    targetId: id,
    oldData: deleted,
  });

  return successResponse(event, "Region deleted", {
    ...mapLocalTimestamps(deleted),
    deletedCount: result?.deletedIds.length ?? 1,
  });
});
