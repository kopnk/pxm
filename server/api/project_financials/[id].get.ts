import { defineEventHandler, createError } from "h3";
import { db } from "~/server/db";
import { projectFinancials } from "~/server/db/schema/project_financials";
import { eq } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin", "staff"]);
  if (forbidden) return forbidden;

  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid ID" });
  }

  const rows = await db
    .select()
    .from(projectFinancials)
    .where(eq(projectFinancials.id, id))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Project financial not found" });
  }

  return successResponse(event, "Project financial retrieved", {
    ...row,
  });
});
