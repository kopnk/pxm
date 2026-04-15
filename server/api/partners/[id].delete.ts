import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { partners } from "~/server/db/schema/partners";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { logAudit } from "~/server/utils/audit";

export default defineEventHandler(async (event) => {

  const forbidden = requireDeleteSuperadmin(event);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  await db.transaction(async (tx) => {

    const rows = await tx
      .select()
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);

    const oldData = rows[0];

    if (!oldData) {
      throw createError({ statusCode: 404, statusMessage: "Partner not found" });
    }

    await tx.delete(partners).where(eq(partners.id, id));

    await logAudit({
      actorId: userId,
      action: "DELETE",
      targetTable: "partners",
      targetId: id,
      oldData,
    });
  });

  return successResponse(event, "Partner deleted");
});
