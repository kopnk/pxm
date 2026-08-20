import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import { getProjectListItemById } from "~/server/utils/projectStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const row = await getProjectListItemById(id);
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Project not found" });
  }

  const data = {
    ...row,
    createdAt: toLocalTime(row.createdAt),
    updatedAt: toLocalTime(row.updatedAt),
  };

  return successResponse(event, "Project retrieved", data);
});
