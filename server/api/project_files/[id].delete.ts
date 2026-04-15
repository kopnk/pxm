import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { projectFiles } from "~/server/db/schema/project_files";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { successResponse } from "~/server/utils/response";
import { eq, isNull } from "drizzle-orm";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";

export default defineEventHandler(async (event) => {
  const forbidden = requireDeleteSuperadmin(event);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.id, id))
      .limit(1);

    const oldData = rows[0];

    if (!oldData || oldData.deletedAt) {
      throw createError({ statusCode: 404, statusMessage: "File not found" });
    }

    const updatedRows = await tx
      .update(projectFiles)
      .set({
        deletedAt: dbTime(),
        deletedBy: userId,
      })
      .where(eq(projectFiles.id, id))
      .returning();

    await logAudit({
      actorId: userId,
      action: "DELETE",
      targetTable: "project_files",
      targetId: id,
      oldData,
      newData: updatedRows[0],
    });
  });

  return successResponse(event, "File soft deleted");
});
