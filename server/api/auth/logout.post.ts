import { defineEventHandler } from "h3";
import { successResponse } from "~/server/utils/response";
import { logAudit } from "~/server/utils/audit";
import {
  clearAuthState,
  resolveAuthSession,
  signOutActiveSession,
} from "~/server/utils/cognitoAuth";

export default defineEventHandler(async (event) => {
  let authSession: Awaited<ReturnType<typeof resolveAuthSession>> = null;

  try {
    authSession = await resolveAuthSession(event);
  } catch {
    authSession = null;
  }

  if (authSession?.kind === "active") {
    try {
      await signOutActiveSession(authSession.state);
    } catch {
      // Clear the local cookie even if Cognito sign-out cannot complete.
    }
  }

  clearAuthState(event);

  if (authSession?.appUser.user.id) {
    await logAudit({
      event,
      actorId: authSession.appUser.user.id,
      action: "LOGOUT",
      targetTable: "users",
      targetId: authSession.appUser.user.id,
    });
  }

  return successResponse(
    event,
    authSession ? "Logged out successfully" : "No active session",
    {
      sessionInvalidated: Boolean(authSession),
    },
    200,
  );
});
