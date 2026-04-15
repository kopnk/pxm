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
  oldData?: unknown;
  newData?: unknown;
}) {
  try {
    await db.insert(auditLog).values({
      actorId,
      action,
      targetTable,
      targetId,
      oldData,
      newData,
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error(
      "logAudit failed:",
      err instanceof Error ? err.message : err,
    );
  }
}
