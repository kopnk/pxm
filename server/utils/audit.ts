import type { H3Event } from "h3";
import { db } from "~/server/db";
import { auditLog } from "~/server/db/schema/audit_log";
import {
  resolveAccessContext,
  serializeAccessContext,
  type AccessContext,
} from "~/server/utils/accessContext";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "CHANGE_PASSWORD"
  | "RESET_PASSWORD";

const TABLE_LABELS: Record<string, string> = {
  users: "Users",
  clients: "Clients",
  partners: "Partners",
  projects: "Projects",
  project_details: "Project Details",
  project_progress: "Project Progress",
  project_financials: "Project Financials",
  project_files: "Project Files",
  progress_stage: "Progress Stage",
  regions: "Regions",
  dcn: "DCN",
  sessions: "Sessions",
};

function resolveLogAccessContext(event?: H3Event): AccessContext {
  if (event?.context?.accessContext) {
    return event.context.accessContext;
  }

  return resolveAccessContext(event);
}

export function buildAuditDescription({
  action,
  targetTable,
  targetId,
}: {
  action: AuditAction;
  targetTable: string;
  targetId?: string;
}): string {
  const tableLabel = TABLE_LABELS[targetTable] ?? targetTable.replace(/_/g, " ");

  let description: string;
  switch (action) {
    case "LOGIN":
      description = "User signed in";
      break;
    case "LOGOUT":
      description = "User signed out";
      break;
    case "CHANGE_PASSWORD":
      description = "User changed password";
      break;
    case "CREATE":
      description = `Created record in ${tableLabel}`;
      break;
    case "UPDATE":
      description = `Updated record in ${tableLabel}`;
      break;
    case "DELETE":
      description = `Deleted record from ${tableLabel}`;
      break;
    default:
      description = `${action} on ${tableLabel}`;
  }

  if (targetId) {
    description += ` (${targetId.slice(0, 8)}…)`;
  }

  return description;
}

export async function logAudit({
  actorId,
  action,
  targetTable,
  targetId,
  oldData,
  newData,
  accessVia,
  description,
  event,
}: {
  actorId: string;
  action: AuditAction;
  targetTable: string;
  targetId?: string;
  oldData?: unknown;
  newData?: unknown;
  accessVia?: string;
  description?: string;
  event?: H3Event;
}) {
  try {
    const accessContext = resolveLogAccessContext(event);

    await db.insert(auditLog).values({
      actorId,
      action,
      targetTable,
      targetId,
      oldData,
      newData,
      accessVia: accessVia ?? serializeAccessContext(accessContext),
      description:
        description ??
        buildAuditDescription({ action, targetTable, targetId }),
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error(
      "logAudit failed:",
      err instanceof Error ? err.message : err,
    );
  }
}
