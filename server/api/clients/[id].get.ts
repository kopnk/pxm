import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { clients } from "~/server/db/schema/clients";
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
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);

  const data = rows[0];

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Client not found" });
  }

  return successResponse(event, "Client detail", {
    ...data,
    createdAt: toLocalTime(data.createdAt),
    updatedAt: toLocalTime(data.updatedAt),
  });
});
