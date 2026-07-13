import { defineEventHandler, readBody, createError } from "h3";
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
import { getAppUserRecordById } from "~/server/utils/appUserStore";

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

  const target = await getAppUserRecordById(userId);

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  if (target.user.role?.toLowerCase() === "superadmin") {
    throw createError({
      statusCode: 400,
      statusMessage: "Superadmin permissions cannot be modified",
    });
  }

  const body = parseBody(rlsUpdateSchema, await readBody(event));
  const permissions = normalizeRlsMatrix(
    body.permissions,
    target.user.role ?? "staff",
  );
  const previous = await getUserPermissionsMatrix(
    target.user.id,
    target.user.role ?? "staff",
  );

  await upsertUserPermissionsMatrix(target.user.id, permissions);

  await logAudit({
    event,
    actorId,
    action: "UPDATE",
    targetTable: "user_permissions",
    targetId: target.user.id,
    oldData: { email: target.user.email, permissions: previous },
    newData: { email: target.user.email, permissions },
  });

  return successResponse(event, "User permissions updated", {
    id: target.user.id,
    email: target.user.email,
    role: target.user.role,
    permissions,
  });
});
