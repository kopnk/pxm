import { createError, defineEventHandler } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import { getProgressStageRecordById } from "~/server/utils/progressStageStore";
import { successResponse } from "~/server/utils/response";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const data = await getProgressStageRecordById(id);

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Progress stage not found" });
  }

  return successResponse(event, "Progress stage retrieved", mapLocalTimestamps(data));
});
