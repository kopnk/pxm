import { defineEventHandler, readBody, createError } from "h3";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema/users";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { successResponse } from "~/server/utils/response";
import {
  rlsUpdateSchema,
  rlsUserIdParamSchema,
} from "~/server/validation/rls.schema";
import { parseBody } from "~/server/utils/zod";
import {
  getUserPermissionsMatrix,
  upsertUserPermissionsMatrix,
} from "~/server/utils/rlsPermissions";
import { normalizeRlsMatrix } from "~/lib/rls";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  const actorId = event.context.user?.id;
  if (!actorId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { userId } = rlsUserIdParamSchema.parse({
    userId: event.context.params?.userId,
  });

  const target = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((r) => r[0]);

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  if (target.role?.toLowerCase() === "superadmin") {
    throw createError({
      statusCode: 400,
      statusMessage: "Superadmin permissions cannot be modified",
    });
  }

  const body = parseBody(rlsUpdateSchema, await readBody(event));
  const permissions = normalizeRlsMatrix(body.permissions, target.role ?? "staff");
  const previous = await getUserPermissionsMatrix(
    target.id,
    target.role ?? "staff",
  );

  await upsertUserPermissionsMatrix(target.id, permissions);

  await logAudit({
    event,
    actorId,
    action: "UPDATE",
    targetTable: "user_permissions",
    targetId: target.id,
    oldData: { email: target.email, permissions: previous },
    newData: { email: target.email, permissions },
  });

  return successResponse(event, "User permissions updated", {
    id: target.id,
    email: target.email,
    role: target.role,
    permissions,
  });
});
