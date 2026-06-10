import { defineEventHandler, getQuery } from "h3";
import { db } from "~/server/db";
import { auditLog } from "~/server/db/schema/audit_log";
import { users } from "~/server/db/schema/users";
import { eq, and, or, ilike, desc, count } from "drizzle-orm";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { toLocalTime } from "~/server/utils/datetime";
import { buildPagination, buildTotalPages } from "~/server/utils/pagination";
import { buildAuditDescription } from "~/server/utils/audit";
import { parseStoredAccessContext } from "~/server/utils/accessContext";

export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);

  const search = query.search?.toString().trim();
  const actorId = query.actorId?.toString();
  const action = query.action?.toString();
  const targetTable = query.targetTable?.toString();

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
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(auditLog.action, pattern),
        ilike(auditLog.targetTable, pattern),
        ilike(auditLog.description, pattern),
        ilike(auditLog.accessVia, pattern),
        ilike(users.email, pattern),
      ),
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const totalResult = await db
    .select({ value: count() })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .where(where);

  const total = Number(totalResult[0]?.value ?? 0);
  const totalPages = buildTotalPages(total, limit);

  const rows = await db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      action: auditLog.action,
      targetTable: auditLog.targetTable,
      targetId: auditLog.targetId,
      oldData: auditLog.oldData,
      newData: auditLog.newData,
      accessVia: auditLog.accessVia,
      description: auditLog.description,
      createdAt: auditLog.createdAt,
      actorEmail: users.email,
      actorRole: users.role,
      actorFirstName: users.firstName,
      actorLastName: users.lastName,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => {
    const metadata: Record<string, unknown> = {};
    if (row.oldData != null) metadata.oldData = row.oldData;
    if (row.newData != null) metadata.newData = row.newData;

    const actionType = row.action as
      | "CREATE"
      | "UPDATE"
      | "DELETE"
      | "LOGIN"
      | "LOGOUT"
      | "CHANGE_PASSWORD";

    return {
      id: row.id,
      actorId: row.actorId,
      action: row.action,
      targetTable: row.targetTable,
      targetId: row.targetId,
      access: parseStoredAccessContext(row.accessVia),
      description:
        row.description ??
        buildAuditDescription({
          action: actionType,
          targetTable: row.targetTable,
          targetId: row.targetId ?? undefined,
        }),
      metadata,
      createdAt: toLocalTime(row.createdAt),
      user: row.actorEmail
        ? {
            email: row.actorEmail,
            role: row.actorRole,
            name: [row.actorFirstName, row.actorLastName]
              .filter(Boolean)
              .join(" ")
              .trim(),
          }
        : null,
    };
  });

  return successResponse(event, "Audit logs retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
