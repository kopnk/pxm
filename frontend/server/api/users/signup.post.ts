import { defineEventHandler, readBody, createError } from "h3";
import { crudActionMessage } from "~/lib/entityMessages";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { userSignupSchema } from "~/server/validation/users.schema";
import { parseBody } from "~/server/utils/zod";
import { assertCreatableUserRole } from "~/server/utils/userRolePolicy";
import { getDefaultUserPassword } from "~/server/utils/defaultUserPassword";
import {
  createCognitoUser,
  deleteCognitoUser,
  isCognitoAuthEnabled,
} from "~/server/utils/cognitoAuth";
import {
  createAppUserRecord,
  getAppUserRecordByEmail,
} from "~/server/utils/appUserStore";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const actor = event.context.user;
  if (!actor?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = parseBody(
    userSignupSchema,
    await readBody(event)
  );

  assertCreatableUserRole(actor.role, body.role ?? "staff");

  const existing = await getAppUserRecordByEmail(body.email);
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: "Email already exists" });
  }

  if (isCognitoAuthEnabled()) {
    const temporaryPassword = getDefaultUserPassword();

    await createCognitoUser({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      temporaryPassword,
    });

    try {
      const created = await createAppUserRecord({
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        region: body.region,
        area: body.area,
        avatarUrl: body.avatarUrl ?? null,
        role: body.role ?? "staff",
        isActive: body.isActive ?? true,
        mustChangePassword: true,
        createdUser: actor.id,
        updatedUser: actor.id,
        createdBy: actor.email,
        updatedBy: actor.email,
      });

      await logAudit({
        event,
        actorId: actor.id,
        action: "CREATE",
        targetTable: "users",
        targetId: created.user.id,
        newData: { email: body.email, role: body.role },
      });

      return successResponse(
        event,
        crudActionMessage("user", "created"),
        { id: created.user.id },
        201
      );
    } catch (error) {
      try {
        await deleteCognitoUser(body.email);
      } catch {
        // Best-effort cleanup if the local transaction fails after Cognito user creation.
      }

      throw error;
    }
  }

  throw createError({
    statusCode: 500,
    statusMessage: "Cognito auth configuration is required",
  });
});
