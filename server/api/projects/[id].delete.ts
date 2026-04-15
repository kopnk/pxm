import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema/projects";
import { eq } from "drizzle-orm";
import { requireDeleteSuperadmin } from "~/server/utils/deleteGuard";
import { successResponse } from "~/server/utils/response";
import { logAudit } from "~/server/utils/audit";

export default defineEventHandler(async (event) => {
  // =========================
  // ROLE CHECK (ONLY SUPERADMIN CAN DELETE)
  // =========================
  const forbidden = requireDeleteSuperadmin(event);
  if (forbidden) return forbidden;

  const id = event.context.params.id;

  // =========================
  // GET OLD DATA (EXPLICIT)
  // =========================
  const oldData = await db
    .select({
      id: projects.id,
      prScNumber: projects.prScNumber,
      poNumber: projects.poNumber,
      projectName: projects.projectName,
      grandTotal: projects.grandTotal,
      status: projects.status,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!oldData) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project not found",
    });
  }

  // =========================
  // DELETE
  // =========================
  const result = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });

  if (!result.length) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete project",
    });
  }

  // =========================
  // AUDIT
  // =========================
  await logAudit({
    actorId: event.context.user.id,
    action: "DELETE",
    targetTable: "projects",
    targetId: id,
    oldData,
  });

  return successResponse(event, "Project deleted");
});
