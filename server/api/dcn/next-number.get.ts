import { defineEventHandler, getQuery, createError } from "h3";
import { db } from "~/server/db";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { getNextDcnOutNumber } from "~/server/utils/dcnNumber";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const typeCode = typeof query.type === "string" ? query.type.trim() : "";
  const letterDate =
    typeof query.letterDate === "string" ? query.letterDate.trim() : "";

  if (!typeCode) {
    throw createError({ statusCode: 400, statusMessage: "Type is required" });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(letterDate)) {
    throw createError({
      statusCode: 400,
      statusMessage: "letterDate must be in YYYY-MM-DD format",
    });
  }

  const number = await getNextDcnOutNumber(db, { typeCode, letterDate });
  return successResponse(event, "Next DCN number generated", { number });
});
