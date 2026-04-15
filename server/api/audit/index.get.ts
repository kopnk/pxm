import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { auditLog } from "~/server/db/schema/audit_log";
import { users } from "~/server/db/schema/users";
import { eq, and, ilike, desc } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";

export default defineEventHandler(async (event) => {

  /* ================= AUTH ================= */
  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  /* ================= QUERY ================= */
  const query = getQuery(event);

  const search = query.search?.toString().trim();
  const actorId = query.actorId?.toString();
  const action = query.action?.toString();
  const targetTable = query.targetTable?.toString();

  /* ================= WHERE ================= */
  const conditions = [];

  if (actorId) {
    conditions.push(eq(auditLog.actorId, actorId));
  }

  if (action) {
    conditions.push(eq(auditLog.action, action));
  }

  if (targetTable) {
    conditions.push(eq(auditLog.targetTable, targetTable));
  }

  if (search) {
    conditions.push(
      ilike(auditLog.action, `%${search}%`)
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  /* ================= DATA ================= */
  const rows = await db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      action: auditLog.action,
      targetTable: auditLog.targetTable,
      targetId: auditLog.targetId,
      oldData: auditLog.oldData,
      newData: auditLog.newData,
      createdAt: auditLog.createdAt,
      actorEmail: users.email,
      actorRole: users.role,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(200); // safeguard supaya tidak kebanyakan

  const items = rows.map((row) => ({
    ...row,
    createdAt: toLocalTime(row.createdAt),
  }));

  return successResponse(event, "Audit logs retrieved", items);
});
