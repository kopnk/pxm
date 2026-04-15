import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { dcn } from "~/server/db/schema/dcn";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime, toLocalDate } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const rows = await db
    .select()
    .from(dcn)
    .where(eq(dcn.id, id))
    .limit(1);

  const data = rows[0];

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "DCN record not found" });
  }

  return successResponse(event, "DCN detail", {
    ...data,
    letterDate: toLocalDate(data.letterDate as unknown as string),
    createdAt: toLocalTime(data.createdAt),
    updatedAt: toLocalTime(data.updatedAt),
  });
});
