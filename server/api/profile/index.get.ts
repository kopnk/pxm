import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { toLocalTime } from "~/server/utils/datetime";
import { getAppUserRecordById } from "~/server/utils/appUserStore";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const authUser = event.context.user;

  if (!authUser?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  /* ================= QUERY ================= */
  const record = await getAppUserRecordById(authUser.id);

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  /* ================= FORMAT ================= */
  return successResponse(event, "Profile retrieved", {
    ...record.user,
    permissions: record.permissions,
    createdAt: toLocalTime(record.user.createdAt),
    updatedAt: toLocalTime(record.user.updatedAt),
    lastLoginAt: record.user.lastLoginAt
      ? toLocalTime(record.user.lastLoginAt)
      : null,
  });
});
