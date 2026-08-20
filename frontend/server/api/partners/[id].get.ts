import { defineEventHandler, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import { getPartnerRecordById } from "~/server/utils/partnerStore";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const data = await getPartnerRecordById(id);

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Partner not found" });
  }

  return successResponse(event, "Partner retrieved", {
    ...data,
    rating: data.rating ?? null,
    createdAt: toLocalTime(data.createdAt),
    updatedAt: toLocalTime(data.updatedAt),
  });
});
