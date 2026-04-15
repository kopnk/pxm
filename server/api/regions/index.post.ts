import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { regions } from "~/server/db/schema";
import { parseBody } from "~/server/utils/zod";
import { createRegionSchema } from "~/server/validation/regions.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";

type BulkNode = {
  name: string;
  type: "region" | "sub_region" | "city_kab";
  children?: BulkNode[];
};

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);

  /* ================= BULK INSERT ================= */
  if (body?.bulk === true) {

    if (!Array.isArray(body.items)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid bulk payload"
      });
    }

    const createdIds: string[] = [];

    await db.transaction(async (tx) => {

      async function insertNode(
        node: BulkNode,
        parentId: string | null = null
      ) {
        const rows = await tx
          .insert(regions)
          .values({
            name: node.name,
            type: node.type,
            parentId,

            // 🔥 DB authoritative time
            createdAt: dbTime(),
            updatedAt: dbTime(),
          })
          .returning();

        const created = rows[0];
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
      201
    );
  }

  /* ================= SINGLE INSERT ================= */
  const payload = parseBody(createRegionSchema, body);

  const created = await db.transaction(async (tx) => {

    const rows = await tx
      .insert(regions)
      .values({
        name: payload.name,
        code: payload.code ?? null,
        type: payload.type,
        parentId: payload.parentId ?? null,

        // 🔥 DB authoritative time
        createdAt: dbTime(),
        updatedAt: dbTime(),
      })
      .returning();

    const createdRow = rows[0];

    await logAudit({
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
    created,
    201
  );
});