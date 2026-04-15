import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { partners } from "~/server/db/schema/partners";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const rows = await db
    .select()
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1);

  const data = rows[0];

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Partner not found" });
  }

  return successResponse(event, "Partner detail", {
    ...data,
    rating: data.rating ? Number(data.rating) : null,
    createdAt: toLocalTime(data.createdAt),
    updatedAt: toLocalTime(data.updatedAt),
  });
});
