import { defineEventHandler, readBody } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { parseBody } from "~/server/utils/zod";
import { auditBulkDeleteSchema } from "~/server/validation/audit.schema";
import { bulkDeleteAuditLogs } from "~/server/utils/auditStore";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  const body = await readBody(event);
  const { ids } = parseBody(auditBulkDeleteSchema, body);

  const deletedCount = await bulkDeleteAuditLogs(ids);

  return successResponse(event, "Audit logs deleted", { deletedCount });
});
