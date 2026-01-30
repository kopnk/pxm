import { db } from "~/server/db";
import { auditLog } from "~/server/db/schema/audit_log";

export async function logAudit({
  actorId,
  action,
  targetTable,
  targetId,
  oldData,
  newData,
}: {
  actorId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "CHANGE_PASSWORD";
  targetTable: string;
  targetId?: string;
  oldData?: any;
  newData?: any;
}) {
  await db.insert(auditLog).values({
    actorId,
    action,
    targetTable,
    targetId,
    oldData,
    newData,
    createdAt: new Date(), // UTC, nanti di-response jadi WIB
  });
}
