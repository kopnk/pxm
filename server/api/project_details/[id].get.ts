import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import { getProjectDetailListItemById } from "~/server/utils/projectDetailStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const row = await getProjectDetailListItemById(id);
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Project detail not found" });
  }

  const data = {
    ...row,
    createdAt: row.createdAt ? toLocalTime(row.createdAt) : null,
    updatedAt: row.updatedAt ? toLocalTime(row.updatedAt) : null,
  };

  return successResponse(event, "Project detail retrieved", data);
});
