import { defineEventHandler, readBody, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { userIdParamSchema, userUpdateSchema } from "~/server/validation/users.schema";
import { parseBody } from "~/server/utils/zod";
import {
  assertAssignableUserRole,
  assertNotSuperadminTarget,
} from "~/server/utils/userRolePolicy";
import {
  getAppUserRecordById,
  updateAppUserRecord,
} from "~/server/utils/appUserStore";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const actor = event.context.user!;
  const { id } = userIdParamSchema.parse(event.context.params);

  const body = parseBody(userUpdateSchema, await readBody(event));

  const current = await getAppUserRecordById(id);
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  assertNotSuperadminTarget(current.user.role ?? "staff", "update");

  if (body.role !== undefined) {
    assertAssignableUserRole(actor.role, current.user.role ?? "staff", body.role);
  }

  const updated = await updateAppUserRecord(id, {
    firstName: body.firstName ?? current.user.firstName,
    lastName: body.lastName ?? current.user.lastName,
    phone: body.phone ?? current.user.phone,
    region: body.region ?? current.user.region,
    area: body.area ?? current.user.area,
    avatarUrl: body.avatarUrl ?? current.user.avatarUrl,
    role:
      actor.role === "superadmin"
        ? body.role ?? current.user.role
        : current.user.role,
    isActive:
      actor.role === "superadmin"
        ? body.isActive ?? current.user.isActive
        : current.user.isActive,
    updatedUser: actor.id,
    updatedBy: actor.email,
  });

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  await logAudit({
    event,
    actorId: actor.id,
    action: "UPDATE",
    targetTable: "users",
    targetId: id,
    oldData: current.user,
    newData: updated.user,
  });

  return successResponse(event, "User updated", updated);
});
