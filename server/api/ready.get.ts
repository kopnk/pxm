import { defineEventHandler, createError } from "h3";
import { sql } from "drizzle-orm";
import { db } from "~/server/db";
import { successResponse } from "~/server/utils/response";

export default defineEventHandler(async (event) => {
  try {
    await db.execute(sql`select 1`);
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: "Database is not ready",
    });
  }

  return successResponse(event, "Service is ready", {
    status: "ready",
    database: "ok",
  });
});
