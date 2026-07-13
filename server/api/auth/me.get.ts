import { defineEventHandler } from "h3";
import { successResponse, errorResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";
import { resolveAuthSession } from "~/server/utils/cognitoAuth";
import type { AppUserRecord } from "~/server/utils/appUserStore";

function formatAuthUser(record: AppUserRecord) {
  return {
    ...record.user,
    createdAt: toLocalTime(record.user.createdAt),
    updatedAt: toLocalTime(record.user.updatedAt),
    lastLoginAt: toLocalTime(record.user.lastLoginAt),
    permissions: record.permissions,
  };
}

export default defineEventHandler(async (event) => {
  const authSession = await resolveAuthSession(event);

  if (!authSession) {
    return errorResponse(event, "Unauthorized - No session", 401);
  }

  if (!authSession.appUser.user.isActive) {
    return errorResponse(event, "Forbidden", 403);
  }

  if (authSession.kind === "challenge") {
    return successResponse(event, "Authenticated", {
      user: formatAuthUser(authSession.appUser),
      permissions: authSession.appUser.permissions,
      session: {
        id: "challenge",
        createdAt: null,
        expiresAt: null,
      },
    });
  }

  return successResponse(event, "Authenticated", {
    user: formatAuthUser(authSession.appUser),
    permissions: authSession.appUser.permissions,
    session: {
      id: "cognito",
      createdAt: null,
      expiresAt: toLocalTime(
        new Date(authSession.state.expiresAt * 1000).toISOString(),
      ),
    },
  });
});
