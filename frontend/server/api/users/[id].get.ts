import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import { getAppUserRecordById } from "~/server/utils/appUserStore";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const actor = event.context.user!;
  const id = event.context.params?.id;

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const record = await getAppUserRecordById(id);
  const user = record?.user;

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return successResponse(event, "User retrieved", {
    ...user,
    createdAt: toLocalTime(user.createdAt),
    updatedAt: toLocalTime(user.updatedAt),
    lastLoginAt: user.lastLoginAt ? toLocalTime(user.lastLoginAt) : null,
  });
});
