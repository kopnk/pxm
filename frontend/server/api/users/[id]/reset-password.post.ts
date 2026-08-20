import { defineEventHandler, createError } from "h3";
import { passwordResetToDefaultMessage } from "~/lib/entityMessages";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { logAudit } from "~/server/utils/audit";
import { assertNotSuperadminTarget } from "~/server/utils/userRolePolicy";
import { getDefaultUserPassword } from "~/server/utils/defaultUserPassword";
import { resetCognitoUserPassword } from "~/server/utils/cognitoAuth";
import {
  getAppUserRecordById,
  updateAppUserRecord,
} from "~/server/utils/appUserStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const actor = event.context.user;
  if (!actor?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const targetId = event.context.params?.id;
  if (!targetId) {
    throw createError({ statusCode: 400, statusMessage: "User id is required" });
  }

  const target = await getAppUserRecordById(targetId);
  if (!target?.user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  assertNotSuperadminTarget(target.user.role ?? "staff", "reset_password");
  const temporaryPassword = getDefaultUserPassword();

  await resetCognitoUserPassword({
    email: target.user.email,
    temporaryPassword,
  });

  await updateAppUserRecord(targetId, {
    mustChangePassword: true,
    updatedUser: actor.id,
    updatedBy: actor.email,
  });

  await logAudit({
    event,
    actorId: actor.id,
    action: "RESET_PASSWORD",
    targetTable: "users",
    targetId: target.user.id,
    newData: { email: target.user.email },
  });

  return successResponse(event, passwordResetToDefaultMessage(), {
    id: target.user.id,
    mustChangePassword: true,
  });
});
