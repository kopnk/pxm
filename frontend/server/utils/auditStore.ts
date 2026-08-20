import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { getAwsRegion } from "~/server/utils/appFilesStorage";
import {
  buildAuditDescription,
  type AuditAction,
} from "~/server/utils/audit";
import { parseStoredAccessContext } from "~/server/utils/accessContext";

export type AuditLogRecord = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  actorName: string | null;
  action: AuditAction;
  targetTable: string;
  targetId: string | null;
  oldData: unknown | null;
  newData: unknown | null;
  accessVia: string | null;
  description: string | null;
  createdAt: string;
};

export type AuditLogListItem = {
  id: string;
  actorId: string | null;
  action: string;
  targetTable: string;
  targetId: string | null;
  access: ReturnType<typeof parseStoredAccessContext>;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: {
    email: string;
    role: string | null;
    name: string;
  } | null;
};

type AuditLogItem = AuditLogRecord & {
  pk: string;
  sk: string;
  gsi1pk: string;
  gsi1sk: string;
  gsi2pk: string;
  gsi2sk: string;
  entityType: "AUDIT_LOG";
  stage: string;
};

const AUDIT_ENTITY = "AUDIT_LOG";

let dynamoClient: DynamoDBDocumentClient | null = null;

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

function normalizeNullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeAuditLogRecord(item: AuditLogItem): AuditLogRecord {
  return {
    id: String(item.id),
    actorId: normalizeNullableText(item.actorId),
    actorEmail: normalizeNullableText(item.actorEmail),
    actorRole: normalizeNullableText(item.actorRole),
    actorName: normalizeNullableText(item.actorName),
    action: String(item.action) as AuditAction,
    targetTable: String(item.targetTable ?? "").trim(),
    targetId: normalizeNullableText(item.targetId),
    oldData: item.oldData ?? null,
    newData: item.newData ?? null,
    accessVia: normalizeNullableText(item.accessVia),
    description: normalizeNullableText(item.description),
    createdAt: String(item.createdAt ?? ""),
  };
}

function toListItem(record: AuditLogRecord): AuditLogListItem {
  const metadata: Record<string, unknown> = {};
  if (record.oldData != null) metadata.oldData = record.oldData;
  if (record.newData != null) metadata.newData = record.newData;

  return {
    id: record.id,
    actorId: record.actorId,
    action: record.action,
    targetTable: record.targetTable,
    targetId: record.targetId,
    access: parseStoredAccessContext(record.accessVia),
    description:
      record.description ??
      buildAuditDescription({
        action: record.action,
        targetTable: record.targetTable,
        targetId: record.targetId ?? undefined,
      }),
    metadata,
    createdAt: record.createdAt,
    user: record.actorEmail
      ? {
          email: record.actorEmail,
          role: record.actorRole,
          name: record.actorName ?? "",
        }
      : null,
  };
}

async function scanAllAuditItems() {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const items: AuditLogItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": AUDIT_ENTITY,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as AuditLogItem[]));
    exclusiveStartKey = response.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (exclusiveStartKey);

  return items;
}

export async function listAuditLogs(filters?: {
  search?: string;
  actorId?: string;
  action?: string;
  targetTable?: string;
}) {
  const search = String(filters?.search ?? "").trim().toLowerCase();
  const actorId = String(filters?.actorId ?? "").trim();
  const action = String(filters?.action ?? "").trim();
  const targetTable = String(filters?.targetTable ?? "").trim();

  return (await scanAllAuditItems())
    .map((item) => ({ item, record: normalizeAuditLogRecord(item) }))
    .filter(({ record }) => {
      if (actorId && record.actorId !== actorId) return false;
      if (action && record.action !== action) return false;
      if (targetTable && record.targetTable !== targetTable) return false;

      if (!search) return true;

      const haystack = [
        record.action,
        record.targetTable,
        record.description ?? "",
        record.accessVia ?? "",
        record.actorEmail ?? "",
        record.actorName ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    })
    .sort((a, b) => {
      const createdCompare = b.record.createdAt.localeCompare(a.record.createdAt);
      if (createdCompare !== 0) return createdCompare;
      return b.record.id.localeCompare(a.record.id);
    })
    .map(({ record }) => toListItem(record));
}

export async function bulkDeleteAuditLogs(ids: string[]) {
  const idSet = new Set(ids);
  const items = (await scanAllAuditItems()).filter((item) => idSet.has(String(item.id)));

  await Promise.all(
    items.map((item) =>
      getDynamoDocumentClient().send(
        new DeleteCommand({
          TableName: getTableName(),
          Key: {
            pk: item.pk,
            sk: item.sk,
          },
        }),
      ),
    ),
  );

  return items.length;
}
