import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { regions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { parseBody } from "~/server/utils/zod";
import { updateRegionSchema, regionIdSchema } from "~/server/validation/regions.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  /* ================= PARAM ================= */
  const { id } = regionIdSchema.parse(event.context.params);

  /* ================= BODY ================= */
  const body = parseBody(updateRegionSchema, await readBody(event));

  /* ================= TRANSACTION ================= */
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

    const rows = await tx
      .update(regions)
      .set({
        name: body.name ?? oldData.name,
        code: body.code ?? oldData.code,
        type: body.type ?? oldData.type,
        parentId:
          body.parentId !== undefined
            ? body.parentId
            : oldData.parentId,

        // 🔥 AUTHORITATIVE DATABASE TIME
        updatedAt: dbTime(),
      })
      .where(eq(regions.id, id))
      .returning();

    const updatedRow = rows[0];

    await logAudit({
      actorId: userId,
      action: "UPDATE",
      targetTable: "regions",
      targetId: id,
      oldData,
      newData: updatedRow,
    });

    return updatedRow;
  });

  return successResponse(
    event,
    "Region updated",
    updated
  );
});