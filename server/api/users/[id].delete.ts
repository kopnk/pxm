import { defineEventHandler } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { userIdParamSchema } from "~/server/validation/users.schema";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  // ✅ VALIDASI PARAM
  const { id } = userIdParamSchema.parse(event.context.params);
  const actor = event.context.user;

  // ❌ tidak boleh delete diri sendiri
  if (id === actor.id) {
    return errorResponse(event, "Cannot delete your own account", 400);
  }

  const oldUser = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!oldUser) {
    return errorResponse(event, "User not found", 404);
  }

  await db.delete(users).where(eq(users.id, id));

  await logAudit({
    actorId: actor.id,
    action: "DELETE",
    targetTable: "users",
    targetId: id,
    oldData: { email: oldUser.email, role: oldUser.role },
  });

  return successResponse(event, "User deleted successfully");
});
