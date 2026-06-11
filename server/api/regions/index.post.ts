import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { regions } from "~/server/db/schema";
import { parseBody } from "~/server/utils/zod";
import { createRegionSchema } from "~/server/validation/regions.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";
import { requireFirstRow } from "~/server/utils/requireFirstRow";
import { mapLocalTimestamps } from "~/server/utils/datetime";

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

    await db.transaction(async (tx) => {
      async function insertNode(
        node: BulkNode,
        parentId: string | null = null,
      ) {
        const rows = await tx
          .insert(regions)
          .values({
            name: node.name,
            type: node.type,
            parentId,
            createdUser: userId,
            updatedUser: userId,
            createdAt: dbTime(),
            updatedAt: dbTime(),
          })
          .returning();

        const created = requireFirstRow(rows, "Region not created");
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
    });

    return successResponse(
      event,
      "Bulk regions created",
      { totalCreated: createdIds.length },
      201,
    );
  }

  const payload = parseBody(createRegionSchema, body);

  const created = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(regions)
      .values({
        name: payload.name,
        type: payload.type,
        parentId: payload.type === "region" ? null : (payload.parentId ?? null),
        createdUser: userId,
        updatedUser: userId,
        createdAt: dbTime(),
        updatedAt: dbTime(),
      })
      .returning();

    const createdRow = requireFirstRow(rows, "Region not created");

    await logAudit({
      event,
      actorId: userId,
      action: "CREATE",
      targetTable: "regions",
      targetId: createdRow.id,
      newData: createdRow,
    });

    return createdRow;
  });

  return successResponse(
    event,
    "Region created",
    mapLocalTimestamps(created),
    201,
  );
});
