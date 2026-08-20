import { defineEventHandler, readBody, createError } from "h3";
import { parseBody } from "~/server/utils/zod";
import { createRegionSchema } from "~/server/validation/regions.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import { createRegionRecord } from "~/server/utils/regionStore";

type BulkNode = {
  name: string;
  type: "region" | "sub_region" | "city_kab";
  children?: BulkNode[];
};

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);

  if (body?.bulk === true) {
    if (!Array.isArray(body.items)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid bulk payload",
      });
    }

    const createdIds: string[] = [];

    async function insertNode(
      node: BulkNode,
      parentId: string | null = null,
    ) {
      const created = await createRegionRecord({
        name: node.name,
        type: node.type,
        parentId,
        createdUser: userId,
        updatedUser: userId,
      });

      createdIds.push(created.id);

      if (node.children?.length) {
        for (const child of node.children) {
          await insertNode(child, created.id);
        }
      }
    }

    for (const root of body.items as BulkNode[]) {
      await insertNode(root, null);
    }

    await logAudit({
      event,
      actorId: userId,
      action: "CREATE",
      targetTable: "regions",
      newData: {
        mode: "bulk",
        createdCount: createdIds.length,
      },
    });

    return successResponse(
      event,
      "Bulk regions created",
      { totalCreated: createdIds.length },
      201,
    );
  }

  const payload = parseBody(createRegionSchema, body);
  const created = await createRegionRecord({
    name: payload.name,
    type: payload.type,
    parentId: payload.type === "region" ? null : (payload.parentId ?? null),
    createdUser: userId,
    updatedUser: userId,
  });

  await logAudit({
    event,
    actorId: userId,
    action: "CREATE",
    targetTable: "regions",
    targetId: created.id,
    newData: created,
  });

  return successResponse(
    event,
    "Region created",
    mapLocalTimestamps(created),
    201,
  );
});
