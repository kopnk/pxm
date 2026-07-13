import { defineEventHandler, readBody, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { passwordChangeRequiredMessage } from "~/lib/entityMessages";
import { toLocalTime } from "~/server/utils/datetime";
import { logAudit } from "~/server/utils/audit";
import { loginSchema } from "~/server/validation/auth.schema";
import { parseBody } from "~/server/utils/zod";
import {
  isCognitoAuthEnabled,
  loginWithPassword,
  writeAuthState,
} from "~/server/utils/cognitoAuth";
import {
  getAppUserRecordByEmail,
  markLegacyUserLastLogin,
} from "~/server/utils/appUserStore";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password } = parseBody(loginSchema, body);

  if (!isCognitoAuthEnabled()) {
    throw createError({
      statusCode: 500,
      statusMessage: "Cognito auth configuration is required",
    });
  }

  const appUser = await getAppUserRecordByEmail(email);
  if (!appUser || !appUser.user.isActive) {
    throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });
  }

  const loginResult = await loginWithPassword(email, password);
  writeAuthState(event, loginResult.state);

  if (loginResult.state.type === "challenge") {
    return successResponse(event, passwordChangeRequiredMessage(), {
      requiresPasswordChange: true,
    });
  }

  const refreshedAppUser = await markLegacyUserLastLogin(appUser.user.id);

  await logAudit({
    event,
    actorId: appUser.user.id,
    action: "LOGIN",
    targetTable: "users",
    targetId: appUser.user.id,
  });

  return successResponse(event, "Login successful", {
    user: {
      ...(refreshedAppUser?.user ?? appUser.user),
      permissions: refreshedAppUser?.permissions ?? appUser.permissions,
    },
    session: {
      id: "cognito",
      createdAt: null,
      expiresAt: toLocalTime(
        new Date(loginResult.state.expiresAt * 1000).toISOString(),
      ),
    },
  });
});
