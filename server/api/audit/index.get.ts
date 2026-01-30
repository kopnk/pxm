import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { auditLog } from "~/server/db/schema/audit_log";
import { users } from "~/server/db/schema/users";
import { eq, and, desc } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);

  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetTable: auditLog.targetTable,
      targetId: auditLog.targetId,
      oldData: auditLog.oldData,
      newData: auditLog.newData,
      createdAt: auditLog.createdAt,
      actor: {
        id: users.id,
        email: users.email,
        role: users.role,
      },
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(50);

  return successResponse(event, "Audit logs retrieved", rows.map(r => ({
    ...r,
    createdAt: toLocalTime(r.createdAt),
  })));
});
