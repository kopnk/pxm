import { defineEventHandler, readBody, createError } from "h3";
import { passwordChangedSignInAgainMessage } from "~/lib/entityMessages";
import { successResponse } from "~/server/utils/response";
import { changePasswordSchema } from "~/server/validation/profile.schema";
import { parseBody } from "~/server/utils/zod";
import { logAudit } from "~/server/utils/audit";
import {
  changeOwnPassword,
  clearAuthState,
  completeNewPasswordChallenge,
  isCognitoAuthEnabled,
  resolveAuthSession,
  signOutActiveSession,
} from "~/server/utils/cognitoAuth";
import { updateAppUserRecord } from "~/server/utils/appUserStore";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const authUser = event.context.user;

  if (!authUser?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  /* ================= VALIDATION ================= */
  const body = await readBody(event);
  const { currentPassword, newPassword } = parseBody(
    changePasswordSchema,
    body
  );

  if (!isCognitoAuthEnabled()) {
    throw createError({
      statusCode: 500,
      statusMessage: "Cognito auth configuration is required",
    });
  }

  const authSession = await resolveAuthSession(event);

  if (!authSession) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  if (authSession.kind === "challenge") {
    const activeState = await completeNewPasswordChallenge(
      authSession.state,
      newPassword,
    );

    await updateAppUserRecord(authSession.appUser.user.id, {
      mustChangePassword: false,
      lastLoginAt: new Date().toISOString(),
      updatedUser: authSession.appUser.user.id,
      updatedBy: authSession.appUser.user.email,
    });

    await logAudit({
      event,
      actorId: authSession.appUser.user.id,
      action: "CHANGE_PASSWORD",
      targetTable: "users",
      targetId: authSession.appUser.user.id,
    });

    try {
      await signOutActiveSession(activeState);
    } catch {
      // Local logout is still enforced even if Cognito global sign-out fails.
    }

    clearAuthState(event);

    return successResponse(event, passwordChangedSignInAgainMessage());
  }

  if (!currentPassword?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Current password is required",
    });
  }

  await changeOwnPassword({
    accessToken: authSession.state.accessToken,
    currentPassword,
    newPassword,
  });

  await updateAppUserRecord(authSession.appUser.user.id, {
    mustChangePassword: false,
    updatedUser: authSession.appUser.user.id,
    updatedBy: authSession.appUser.user.email,
  });

  await logAudit({
    event,
    actorId: authSession.appUser.user.id,
    action: "CHANGE_PASSWORD",
    targetTable: "users",
    targetId: authSession.appUser.user.id,
  });

  try {
    await signOutActiveSession(authSession.state);
  } catch {
    // Local logout is still enforced even if Cognito global sign-out fails.
  }

  clearAuthState(event);

  return successResponse(event, passwordChangedSignInAgainMessage());
});
