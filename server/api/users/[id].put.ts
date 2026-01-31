import { defineEventHandler, readBody } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { userIdParamSchema, userUpdateSchema } from "~/server/validation/users.schema";
import { parseBody } from "~/server/utils/zod";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const { id } = userIdParamSchema.parse(event.context.params);
  const actor = event.context.user;

  // ✅ VALIDASI BODY
  const body = parseBody(userUpdateSchema, await readBody(event));

  const oldUser = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      region: users.region,
      area: users.area,
      role: users.role,
      isActive: users.isActive,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!oldUser) {
    return errorResponse(event, "User not found", 404);
  }

  const updateData: any = {
    ...body,
    updatedAt: new Date(),
  };

  // ❌ admin tidak boleh ubah role & isActive
  if (actor.role !== "superadmin") {
    delete updateData.role;
    delete updateData.isActive;
  }

  await db.update(users).set(updateData).where(eq(users.id, id));

  await logAudit({
    actorId: actor.id,
    action: "UPDATE",
    targetTable: "users",
    targetId: id,
    oldData: oldUser,
    newData: updateData,
  });

  return successResponse(event, "User updated successfully");
});
