import { defineEventHandler, readBody, createError } from "h3";
import { parseBody } from "~/server/utils/zod";
import {
  createProjectDetailBulkSchema,
  type CreateProjectDetailInput,
} from "~/server/validation/project_details.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import {
  createProjectDetailRecords,
  getProjectDetailListItemById,
} from "~/server/utils/projectDetailStore";
import {
  createProjectProgressRecord,
  getProjectProgressListItemById,
} from "~/server/utils/projectProgressStore";

export default defineEventHandler(async (event) => {
  const rawBody = await readBody(event);
  const isBulkPayload = Array.isArray(rawBody);

  const forbidden = requireRole(
    event,
    isBulkPayload ? ["superadmin"] : ["superadmin", "admin"],
  );
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const parsed = parseBody(createProjectDetailBulkSchema, rawBody);

  const payload: CreateProjectDetailInput[] = Array.isArray(parsed) ? parsed : [parsed];

  if (!payload.length) {
    throw createError({ statusCode: 400, statusMessage: "Empty payload" });
  }

  let created;
  try {
    created = await createProjectDetailRecords(
      payload.map((item) => ({
        projectId: item.projectId,
        cityKabId: item.cityKabId,
        picArea: item.picArea ?? null,
        lineNumber: item.lineNumber ?? null,
        systemkey: item.systemkey.trim(),
        neId: item.neId ?? null,
        materialId: item.materialId ?? null,
        materialName: item.materialName ?? null,
        siteId: item.siteId ?? null,
        siteName: item.siteName,
        quantity: item.quantity,
        uom: item.uom ?? null,
        unitPrice: item.unitPrice,
        status: item.status ?? "active",
        remarksProjectsDetails: item.remarksProjectsDetails ?? null,
        remarksDelay: item.remarksDelay ?? null,
        remarksCancel: item.remarksCancel ?? null,
        taxOut: item.taxOut ?? null,
        createdUser: userId,
        updatedUser: userId,
      })),
    );
  } catch (err: unknown) {
    const statusCode =
      typeof err === "object" &&
      err !== null &&
      "statusCode" in err &&
      typeof (err as { statusCode?: unknown }).statusCode === "number"
        ? ((err as { statusCode: number }).statusCode)
        : 500;

    throw createError({
      statusCode,
      statusMessage: err instanceof Error ? err.message : "Failed to create project detail",
    });
  }

  for (const row of created) {
    await logAudit({
      event,
      actorId: userId,
      action: "CREATE",
      targetTable: "project_details",
      targetId: row.id,
      newData: row,
    });
  }

  const createdProgress = await Promise.all(
    created.map((row) =>
      createProjectProgressRecord({
        projectId: row.projectId,
        projectDetailId: row.id,
        createdUser: userId,
        updatedUser: userId,
      }),
    ),
  );

  for (const row of createdProgress) {
    const enrichedProgress = await getProjectProgressListItemById(row.id);
    await logAudit({
      event,
      actorId: userId,
      action: "CREATE",
      targetTable: "project_progress",
      targetId: row.id,
      newData: enrichedProgress ?? row,
    });
  }

  const enriched = (
    await Promise.all(
      created.map((row) => getProjectDetailListItemById(row.id)),
    )
  ).filter(Boolean);

  const data = enriched.map((row) => ({
    ...row,
    ...mapLocalTimestamps(row!),
  }));

  return successResponse(
    event,
    `Project detail created (${data.length} row)`,
    data,
    201,
  );
});
