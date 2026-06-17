import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { projectFiles } from "~/server/db/schema/project_files";
import { parseBody } from "~/server/utils/zod";
import { updateProjectFileSchema } from "~/server/validation/project_files.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { eq, and, isNull } from "drizzle-orm";
import { logAudit } from "~/server/utils/audit";
import { withProjectFileSignedUrls } from "~/server/utils/projectFileStorage";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const body = parseBody(updateProjectFileSchema, await readBody(event));

  const updated = await db.transaction(async (tx) => {
    const oldRows = await tx
      .select()
      .from(projectFiles)
      .where(and(eq(projectFiles.id, id), isNull(projectFiles.deletedAt)))
      .limit(1);

    const oldData = oldRows[0];

    if (!oldData) {
      throw createError({ statusCode: 404, statusMessage: "File not found" });
    }

    const rows = await tx
      .update(projectFiles)
      .set({
        fileCategory: body.fileCategory ?? oldData.fileCategory,
        fileName: body.fileName ?? oldData.fileName,
        version: body.version ?? oldData.version,
        isArchived: body.isArchived ?? oldData.isArchived,
      })
      .where(eq(projectFiles.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
      throw createError({ statusCode: 500, statusMessage: "Update failed" });
    }

    await logAudit({
      event,
      actorId: userId,
      action: "UPDATE",
      targetTable: "project_files",
      targetId: id,
      oldData,
      newData: row,
    });

    return row;
  });

  const [signedFile] = await withProjectFileSignedUrls([updated]);
  return successResponse(event, "File updated", signedFile);
});
