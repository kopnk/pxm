import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { regions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { parseBody } from "~/server/utils/zod";
import {
  createRegionSchema,
  updateRegionSchema,
  regionIdSchema,
} from "~/server/validation/regions.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";
import { requireFirstRow } from "~/server/utils/requireFirstRow";
import { mapLocalTimestamps } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { id } = regionIdSchema.parse(event.context.params);
  const body = parseBody(updateRegionSchema, await readBody(event));

  const updated = await db.transaction(async (tx) => {
    const oldRows = await tx
      .select()
      .from(regions)
      .where(eq(regions.id, id))
      .limit(1);

    const oldData = oldRows[0];

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

    const rows = await tx
      .update(regions)
      .set({
        name: body.name ?? oldData.name,
        type: nextType,
        parentId: nextParentId,
        updatedUser: userId,
        updatedAt: dbTime(),
      })
      .where(eq(regions.id, id))
      .returning();

    const updatedRow = requireFirstRow(rows, "Region not found");

    await logAudit({
      event,
      actorId: userId,
      action: "UPDATE",
      targetTable: "regions",
      targetId: id,
      oldData,
      newData: updatedRow,
    });

    return updatedRow;
  });

  return successResponse(event, "Region updated", mapLocalTimestamps(updated));
});
