import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { dcn } from "~/server/db/schema/dcn";
import { parseBody } from "~/server/utils/zod";
import { dcnCreateSchema } from "~/server/validation/dcn.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { toLocalTime, toLocalDate } from "~/server/utils/datetime";
import { dbTime } from "~/server/utils/dbTime";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = parseBody(dcnCreateSchema, await readBody(event));

  const created = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(dcn)
      .values({
        letterDate: body.letterDate,
        number: body.number,
        type: body.type ?? null,
        toAddress: body.toAddress ?? null,
        fromAddress: body.fromAddress ?? null,
        subject: body.subject ?? null,
        flow: body.flow,
        createdUser: userId,
        createdAt: dbTime(),
        updatedAt: dbTime(),
      })
      .returning();

    const row = rows[0];

    await logAudit({
      actorId: userId,
      action: "CREATE",
      targetTable: "dcn",
      targetId: row.id,
      newData: row,
    });

    return row;
  });

  return successResponse(
    event,
    "DCN record created",
    {
      ...created,
      letterDate: toLocalDate(created.letterDate as unknown as string),
      createdAt: toLocalTime(created.createdAt),
      updatedAt: toLocalTime(created.updatedAt),
    },
    201,
  );
});
