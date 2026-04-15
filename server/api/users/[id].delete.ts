import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { logAudit } from "~/server/utils/audit";
import { userIdParamSchema } from "~/server/validation/users.schema";

export default defineEventHandler(async (event) => {

  const forbidden = requireDeleteSuperadmin(event);
  if (forbidden) return forbidden;

  const actor = event.context.user!;
  const { id } = userIdParamSchema.parse(event.context.params);

  if (id === actor.id) {
    throw createError({ statusCode: 400, statusMessage: "Cannot delete your own account" });
  }

  await db.transaction(async (tx) => {

    const rows = await tx
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    const oldUser = rows[0];

    if (!oldUser) {
      throw createError({ statusCode: 404, statusMessage: "User not found" });
    }

    await tx.delete(users).where(eq(users.id, id));

    await logAudit({
      actorId: actor.id,
      action: "DELETE",
      targetTable: "users",
      targetId: id,
      oldData: oldUser,
    });
  });

  return successResponse(event, "User deleted successfully");
});
