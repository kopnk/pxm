import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { projectProgress, type StageData } from "~/server/db/schema/project_progress";
import { projectDetails } from "~/server/db/schema/project_details";

import { eq } from "drizzle-orm";

import { parseBody } from "~/server/utils/zod";
import { updateProjectProgressSchema } from "~/server/validation/project_progress.schema";

import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { logAudit } from "~/server/utils/audit";
import { dbTime } from "~/server/utils/dbTime";
import { requireFirstRow } from "~/server/utils/requireFirstRow";
import { mapLocalTimestamps } from "~/server/utils/datetime";
import { validateStageDataKeys } from "~/server/utils/progressStageValidation";
import {
  syncOutFlowFinancialAfterProgressSave,
  reconcilePaidSyncForProjectDetail,
} from "~/server/utils/syncProjectFinancialPaidWithProgress";

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

  const body = parseBody(
    updateProjectProgressSchema,
    await readBody(event),
  );
  await validateStageDataKeys(body.stageData);

  const updated = await db.transaction(async (tx) => {
    const oldRows = await tx
      .select()
      .from(projectProgress)
      .where(eq(projectProgress.id, id))
      .limit(1);

    const oldData = oldRows[0];

    if (!oldData) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project progress not found",
      });
    }

    const newStageData = {
      ...(oldData.stageData ?? {}),
      ...(body.stageData ?? {}),
    };

    const detailId = body.projectDetailId ?? oldData.projectDetailId;

    const detailRows = await tx
      .select()
      .from(projectDetails)
      .where(eq(projectDetails.id, detailId))
      .limit(1);

    const d = detailRows[0];

    const nextRemarksDelay =
      body.remarksDelay !== undefined
        ? body.remarksDelay
        : d?.remarksDelay ?? null;

    for (const stageCode in newStageData) {
      const stage = newStageData[stageCode];
      if (!stage) continue;

      if (stage.status === "approved" && !stage.actual_approve_date) {
        throw createError({
          statusCode: 400,
          statusMessage: `Approve date required for stage ${stageCode}`,
        });
      }

      if (
        stage.status === "delayed" &&
        !String(nextRemarksDelay ?? "").trim()
      ) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Remarks delay (on project detail) is required when any stage is delayed",
        });
      }
    }

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
          updatedUser: userId,
          updatedAt: dbTime(),
        })
        .where(eq(projectDetails.id, detailId));
    }

    const rows = await tx
      .update(projectProgress)
      .set({
        projectId: body.projectId ?? oldData.projectId,
        projectDetailId: detailId,

        stageData: newStageData,

        updatedUser: userId,
        updatedAt: dbTime(),
      })
      .where(eq(projectProgress.id, id))
      .returning();

    const updatedRow = requireFirstRow(rows, "Project progress not found");

    await logAudit({
      event,
      actorId: userId,
      action: "UPDATE",
      targetTable: "project_progress",
      targetId: id,
      oldData,
      newData: updatedRow,
    });

    await syncOutFlowFinancialAfterProgressSave(tx, {
      projectDetailId: updatedRow.projectDetailId,
      projectProgressId: updatedRow.id,
      stageData: (updatedRow.stageData ?? {}) as StageData,
    });
    await reconcilePaidSyncForProjectDetail(tx, updatedRow.projectDetailId);

    return updatedRow;
  });

  return successResponse(
    event,
    "Project progress updated",
    mapLocalTimestamps(updated),
  );
});
