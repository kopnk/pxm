import { defineEventHandler, createError } from "h3";
import { crudActionMessage } from "~/lib/entityMessages";
import { successResponse } from "~/server/utils/response";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { logAudit } from "~/server/utils/audit";
import { userIdParamSchema } from "~/server/validation/users.schema";
import { assertNotSuperadminTarget } from "~/server/utils/userRolePolicy";
import { deleteCognitoUser } from "~/server/utils/cognitoAuth";
import {
  deleteAppUserRecord,
  getAppUserRecordById,
} from "~/server/utils/appUserStore";

export default defineEventHandler(async (event) => {

  const forbidden = requireDeleteSuperadmin(event);
  if (forbidden) return forbidden;

  const actor = event.context.user!;
  const { id } = userIdParamSchema.parse(event.context.params);

  if (id === actor.id) {
    throw createError({ statusCode: 400, statusMessage: "Cannot delete your own account" });
  }

  const current = await getAppUserRecordById(id);
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  assertNotSuperadminTarget(current.user.role ?? "staff", "delete");

  await deleteCognitoUser(current.user.email);
  await deleteAppUserRecord(id);

  await logAudit({
    event,
    actorId: actor.id,
    action: "DELETE",
    targetTable: "users",
    targetId: id,
    oldData: current.user,
  });

  return successResponse(event, crudActionMessage("user", "deleted"));
});
