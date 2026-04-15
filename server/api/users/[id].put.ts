import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { userIdParamSchema, userUpdateSchema } from "~/server/validation/users.schema";
import { parseBody } from "~/server/utils/zod";
import { dbTime } from "~/server/utils/dbTime";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const actor = event.context.user!;
  const { id } = userIdParamSchema.parse(event.context.params);

  const body = parseBody(userUpdateSchema, await readBody(event));

  const updated = await db.transaction(async (tx) => {

    const oldRows = await tx
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    const oldUser = oldRows[0];

    if (!oldUser) {
      throw createError({ statusCode: 404, statusMessage: "User not found" });
    }

    const updateData: any = {
      firstName: body.firstName ?? oldUser.firstName,
      lastName: body.lastName ?? oldUser.lastName,
      phone: body.phone ?? oldUser.phone,
      region: body.region ?? oldUser.region,
      area: body.area ?? oldUser.area,
      avatarUrl: body.avatarUrl ?? oldUser.avatarUrl,

      // ✅ DATABASE TIME ONLY
      updatedAt: dbTime(),
    };

    if (actor.role === "superadmin") {
      updateData.role = body.role ?? oldUser.role;
      updateData.isActive = body.isActive ?? oldUser.isActive;
    }

    const rows = await tx
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    await logAudit({
      actorId: actor.id,
      action: "UPDATE",
      targetTable: "users",
      targetId: id,
      oldData: oldUser,
      newData: rows[0],
    });

    return rows[0];
  });

  return successResponse(event, "User updated successfully", updated);
});