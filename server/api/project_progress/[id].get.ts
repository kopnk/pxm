import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { projectProgress } from "~/server/db/schema/project_progress";
import { projectDetails } from "~/server/db/schema/project_details";
import { eq } from "drizzle-orm";

import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime, toLocalDate } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */

  const forbidden = requireRole(event, ["superadmin", "admin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  /* ================= QUERY ================= */

  const rows = await db
    .select({
      progress: projectProgress,
      remarksProjectsDetails: projectDetails.remarksProjectsDetails,
      remarksDelay: projectDetails.remarksDelay,
      remarksCancel: projectDetails.remarksCancel,
    })
    .from(projectProgress)
    .leftJoin(
      projectDetails,
      eq(projectDetails.id, projectProgress.projectDetailId),
    )
    .where(eq(projectProgress.id, id))
    .limit(1);

  const hit = rows[0];

  if (!hit) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project progress not found",
    });
  }

  const row = hit.progress;
  const remarksProjectsDetails = hit.remarksProjectsDetails ?? null;
  const remarksDelay = hit.remarksDelay ?? null;
  const remarksCancel = hit.remarksCancel ?? null;

  /* ================= FORMAT STAGE JSON ================= */

  const stageData = Object.fromEntries(
    Object.entries(row.stageData ?? {}).map(([stageCode, stage]: any) => [
      stageCode,
      {
        ...stage,
        plan_submit_date: toLocalDate(stage.plan_submit_date),
        actual_approve_date: toLocalDate(stage.actual_approve_date),
      },
    ])
  );

  /* ================= RESPONSE ================= */

  const { stageData: _sd, ...progressRest } = row;

  const item = {
    ...progressRest,
    stageData,

    remarksProjectsDetails,
    remarksDelay,
    remarksCancel,

    createdAt: toLocalTime(row.createdAt),
    updatedAt: toLocalTime(row.updatedAt),
  };

  return successResponse(event, "Project progress retrieved", item);

});