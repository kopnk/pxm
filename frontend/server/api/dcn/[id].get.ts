import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime, toLocalDate } from "~/server/utils/datetime";
import { getDcnListItemById } from "~/server/utils/dcnStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const data = await getDcnListItemById(id);

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "DCN record not found" });
  }

  return successResponse(event, "DCN record retrieved", {
    ...data,
    letterDate: toLocalDate(data.letterDate as unknown as string),
    createdAt: toLocalTime(data.createdAt),
    updatedAt: toLocalTime(data.updatedAt),
  });
});
