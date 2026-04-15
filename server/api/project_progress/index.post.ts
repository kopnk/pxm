import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { projectProgress } from "~/server/db/schema/project_progress";
import { projectDetails } from "~/server/db/schema/project_details";
import { parseBody } from "~/server/utils/zod";
import { createProjectProgressSchema } from "~/server/validation/project_progress.schema";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";
import { toLocalTime } from "~/server/utils/datetime";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin", "admin"]);
  if (forbidden) return forbidden;

  const userId = event.context.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = parseBody(
    createProjectProgressSchema,
    await readBody(event),
  );

  const created = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(projectProgress)
      .where(eq(projectProgress.projectDetailId, body.projectDetailId))
      .limit(1);

    if (existing.length) {
      throw createError({
        statusCode: 400,
        statusMessage: "Project progress already exists for this detail",
      });
    }

    const stageData = body.stageData ?? {};

    const detailRows = await tx
      .select()
      .from(projectDetails)
      .where(eq(projectDetails.id, body.projectDetailId))
      .limit(1);

    const d = detailRows[0];

    const hasRemarkPatch =
      body.remarksProjectsDetails !== undefined ||
      body.remarksDelay !== undefined ||
      body.remarksCancel !== undefined;

    if (d && hasRemarkPatch) {
      await tx
        .update(projectDetails)
        .set({
          remarksProjectsDetails:
            body.remarksProjectsDetails !== undefined
              ? body.remarksProjectsDetails
              : d.remarksProjectsDetails,
          remarksDelay:
            body.remarksDelay !== undefined
              ? body.remarksDelay
              : d.remarksDelay,
          remarksCancel:
            body.remarksCancel !== undefined
              ? body.remarksCancel
              : d.remarksCancel,
          updatedAt: dbTime(),
        })
        .where(eq(projectDetails.id, body.projectDetailId));
    }

    const rows = await tx
      .insert(projectProgress)
      .values({
        projectId: body.projectId,
        projectDetailId: body.projectDetailId,

        stageData,

        createdUser: userId,
        createdAt: dbTime(),
        updatedAt: dbTime(),
      })
      .returning();

    const createdRow = rows[0];

    await logAudit({
      actorId: userId,
      action: "CREATE",
      targetTable: "project_progress",
      targetId: createdRow.id,
      newData: createdRow,
    });

    return createdRow;
  });

  return successResponse(
    event,
    "Project progress created",
    {
      ...created,

      createdAt: toLocalTime(created.createdAt),
      updatedAt: toLocalTime(created.updatedAt),
    },
    201,
  );
});
