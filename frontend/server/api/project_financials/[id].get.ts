import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import { getProjectFinancialListItemById } from "~/server/utils/projectFinancialStore";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const row = await getProjectFinancialListItemById(id);

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Project financial not found" });
  }

  return successResponse(
    event,
    "Project financial retrieved",
    mapLocalTimestamps(row),
  );
});
