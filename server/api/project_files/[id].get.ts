import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { projectFiles } from "~/server/db/schema/project_files";
import { eq, and, isNull } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const rows = await db
    .select()
    .from(projectFiles)
    .where(and(eq(projectFiles.id, id), isNull(projectFiles.deletedAt)))
    .limit(1);

  const file = rows[0];

  if (!file) {
    throw createError({ statusCode: 404, statusMessage: "File not found" });
  }

  return successResponse(event, "File retrieved", file);
});
