import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import { getClientRecordById } from "~/server/utils/clientStore";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const data = await getClientRecordById(id);

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Client not found" });
  }

  return successResponse(event, "Client retrieved", {
    ...data,
    createdAt: toLocalTime(data.createdAt),
    updatedAt: toLocalTime(data.updatedAt),
  });
});
