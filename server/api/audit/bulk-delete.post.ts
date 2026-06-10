import { defineEventHandler, readBody } from "h3";
import { db } from "~/server/db";
import { auditLog } from "~/server/db/schema/audit_log";
import { inArray } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { parseBody } from "~/server/utils/zod";
import { auditBulkDeleteSchema } from "~/server/validation/audit.schema";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  const body = await readBody(event);
  const { ids } = parseBody(auditBulkDeleteSchema, body);

  await db.delete(auditLog).where(inArray(auditLog.id, ids));

  return successResponse(event, "Audit logs deleted", { deletedCount: ids.length });
});
