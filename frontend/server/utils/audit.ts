import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import type { H3Event } from "h3";
import { randomUUID } from "node:crypto";
import {
  resolveAccessContext,
  serializeAccessContext,
  type AccessContext,
} from "~/server/utils/accessContext";
import { getAwsRegion } from "~/server/utils/appFilesStorage";
import { getAppUserRecordById } from "~/server/utils/appUserStore";

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

let dynamoClient: DynamoDBDocumentClient | null = null;

function nowIso() {
  return new Date().toISOString();
}

function getTableName() {
  const tableName =
    process.env.AWS_DYNAMODB_TABLE?.trim() ||
    process.env.TABLE_NAME?.trim() ||
    "";

  if (!tableName) {
    throw new Error("AWS_DYNAMODB_TABLE or TABLE_NAME is required.");
  }

  return tableName;
}

function getDynamoDocumentClient() {
  if (!dynamoClient) {
    dynamoClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: getAwsRegion() }),
      {
        marshallOptions: {
          removeUndefinedValues: true,
        },
      },
    );
  }

  return dynamoClient;
}

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
  const tableLabel =
    TABLE_LABELS[targetTable] ?? targetTable.replace(/_/g, " ");

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
    description += ` (${targetId.slice(0, 8)}...)`;
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
    const createdAt = nowIso();
    const auditId = randomUUID();
    const monthBucket = createdAt.slice(0, 7);
    const actor = await getAppUserRecordById(actorId);

    await getDynamoDocumentClient().send(
      new PutCommand({
        TableName: getTableName(),
        Item: {
          pk: `AUDIT#${monthBucket}`,
          sk: `${createdAt}#${auditId}`,
          gsi1pk: `AUDIT_TARGET#${targetTable}`,
          gsi1sk: `${createdAt}#${targetId ?? auditId}`,
          gsi2pk: `AUDIT_ACTOR#${actorId}`,
          gsi2sk: `${createdAt}#${auditId}`,
          entityType: "AUDIT_LOG",
          stage: process.env.PXM_STAGE?.trim() || "dev",
          id: auditId,
          actorId,
          actorEmail: actor?.user.email ?? null,
          actorRole: actor?.user.role ?? null,
          actorName: actor
            ? [actor.user.firstName, actor.user.lastName]
                .filter(Boolean)
                .join(" ")
                .trim()
            : null,
          action,
          targetTable,
          targetId: targetId ?? null,
          oldData: oldData ?? null,
          newData: newData ?? null,
          accessVia: accessVia ?? serializeAccessContext(accessContext),
          description:
            description ??
            buildAuditDescription({ action, targetTable, targetId }),
          createdAt,
        },
      }),
    );
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error(
      "logAudit failed:",
      err instanceof Error ? err.message : err,
    );
  }
}
