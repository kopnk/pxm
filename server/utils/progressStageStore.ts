import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { getAwsRegion } from "~/server/utils/appFilesStorage";
import { getAppUserRecordById } from "~/server/utils/appUserStore";
import { formatAuditUserEmail } from "~/server/utils/createdBy";

export type ProgressStageType = "admin" | "field" | "document";

export type ProgressStageRecord = {
  id: string;
  code: string;
  name: string;
  stageType: ProgressStageType;
  sequence: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdUser: string | null;
  updatedUser: string | null;
};

export type ProgressStageListItem = ProgressStageRecord & {
  createdBy: string | null;
  updatedBy: string | null;
};

type ProgressStageItem = ProgressStageRecord & {
  pk: string;
  sk: "META";
  gsi1pk: string;
  gsi1sk: string;
  entityType: "PROGRESS_STAGE";
  stage: string;
};

const PROGRESS_STAGE_SK = "META";
const PROGRESS_STAGE_ENTITY = "PROGRESS_STAGE";

let dynamoClient: DynamoDBDocumentClient | null = null;

function nowIso() {
  return new Date().toISOString();
}

function getStageName() {
  return process.env.PXM_STAGE?.trim() || "dev";
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
    const baseClient = new DynamoDBClient({
      region: getAwsRegion(),
    });

    dynamoClient = DynamoDBDocumentClient.from(baseClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }

  return dynamoClient;
}

function buildProgressStagePk(stageId: string) {
  return `PROGRESS_STAGE#${stageId}`;
}

function normalizeProgressStageType(value: unknown): ProgressStageType {
  const type = String(value ?? "document").trim().toLowerCase();
  if (type === "admin" || type === "field") return type;
  return "document";
}

function normalizeProgressStageRecord(
  record: Partial<ProgressStageRecord> & { id: string },
): ProgressStageRecord {
  const createdAt = String(record.createdAt ?? nowIso());
  const updatedAt = String(record.updatedAt ?? createdAt);

  return {
    id: String(record.id),
    code: String(record.code ?? "").trim().toLowerCase(),
    name: String(record.name ?? "").trim(),
    stageType: normalizeProgressStageType(record.stageType),
    sequence: Math.max(1, Math.trunc(Number(record.sequence ?? 1) || 1)),
    isRequired:
      record.isRequired === undefined ? true : Boolean(record.isRequired),
    isActive: record.isActive === undefined ? true : Boolean(record.isActive),
    createdAt,
    updatedAt,
    createdUser: record.createdUser ? String(record.createdUser) : null,
    updatedUser: record.updatedUser ? String(record.updatedUser) : null,
  };
}

function toProgressStageItem(record: ProgressStageRecord): ProgressStageItem {
  const normalized = normalizeProgressStageRecord(record);

  return {
    pk: buildProgressStagePk(normalized.id),
    sk: PROGRESS_STAGE_SK,
    gsi1pk: `PROGRESS_STAGE_ACTIVE#${normalized.isActive ? "1" : "0"}`,
    gsi1sk: `SEQUENCE#${String(normalized.sequence).padStart(6, "0")}#${normalized.code}`,
    entityType: PROGRESS_STAGE_ENTITY,
    stage: getStageName(),
    ...normalized,
  };
}

function mapProgressStageItem(item: ProgressStageItem): ProgressStageRecord {
  return normalizeProgressStageRecord(item);
}

async function scanAllProgressStageItems() {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const items: ProgressStageItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": PROGRESS_STAGE_ENTITY,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as ProgressStageItem[]));
    exclusiveStartKey = response.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (exclusiveStartKey);

  return items;
}

async function ensureUniqueStageCode(code: string, excludeId?: string) {
  const normalizedCode = code.trim().toLowerCase();
  const existing = (await scanAllProgressStageItems()).map(mapProgressStageItem);
  const hit = existing.find(
    (item) => item.code === normalizedCode && item.id !== excludeId,
  );

  if (hit) {
    const error = new Error("Progress stage code already exists") as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }
}

async function buildAuditEmailMap(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  const entries = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const user = await getAppUserRecordById(userId);
      return [userId, formatAuditUserEmail(user?.user.email)] as const;
    }),
  );

  return new Map(entries);
}

async function enrichProgressStageList(
  records: ProgressStageRecord[],
): Promise<ProgressStageListItem[]> {
  const auditEmailMap = await buildAuditEmailMap(
    records.flatMap((record) => [
      record.createdUser ?? "",
      record.updatedUser ?? "",
    ]),
  );

  return records.map((record) => ({
    ...record,
    createdBy: record.createdUser
      ? auditEmailMap.get(record.createdUser) ?? null
      : null,
    updatedBy: record.updatedUser
      ? auditEmailMap.get(record.updatedUser) ?? null
      : null,
  }));
}

export async function getProgressStageRecordById(stageId: string) {
  const client = getDynamoDocumentClient();
  const tableName = getTableName();
  const response = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: buildProgressStagePk(stageId),
        sk: PROGRESS_STAGE_SK,
      },
    }),
  );

  const item = response.Item as ProgressStageItem | undefined;
  return item ? mapProgressStageItem(item) : null;
}

export async function listProgressStageRecords(filters?: {
  search?: string;
  stageType?: string;
  isActive?: boolean;
  codes?: string[];
}) {
  const search = String(filters?.search ?? "").trim().toLowerCase();
  const stageType = String(filters?.stageType ?? "").trim().toLowerCase();
  const codes = new Set(
    (filters?.codes ?? []).map((code) => code.trim().toLowerCase()),
  );

  const records = (await scanAllProgressStageItems())
    .map(mapProgressStageItem)
    .filter((record) => {
      if (stageType && record.stageType !== stageType) return false;

      if (
        filters?.isActive !== undefined &&
        Boolean(record.isActive) !== filters.isActive
      ) {
        return false;
      }

      if (codes.size > 0 && !codes.has(record.code)) {
        return false;
      }

      if (search) {
        const haystack = [record.code, record.name, record.stageType]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const seqCompare = a.sequence - b.sequence;
      if (seqCompare !== 0) return seqCompare;
      return a.code.localeCompare(b.code);
    });

  return enrichProgressStageList(records);
}

export async function createProgressStageRecord(
  params: Omit<
    ProgressStageRecord,
    "id" | "createdAt" | "updatedAt" | "updatedUser"
  > & {
    updatedUser?: string | null;
  },
) {
  await ensureUniqueStageCode(params.code);

  const createdAt = nowIso();
  const record = normalizeProgressStageRecord({
    id: randomUUID(),
    ...params,
    createdAt,
    updatedAt: createdAt,
    updatedUser: params.updatedUser ?? params.createdUser ?? null,
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toProgressStageItem(record),
    }),
  );

  return record;
}

export async function updateProgressStageRecord(
  stageId: string,
  updates: Partial<Omit<ProgressStageRecord, "id" | "createdAt" | "createdUser">>,
) {
  const current = await getProgressStageRecordById(stageId);
  if (!current) return null;

  const nextCode = String(updates.code ?? current.code).trim().toLowerCase();
  if (nextCode !== current.code) {
    await ensureUniqueStageCode(nextCode, current.id);
  }

  const nextRecord = normalizeProgressStageRecord({
    ...current,
    ...updates,
    id: current.id,
    code: nextCode,
    createdAt: current.createdAt,
    createdUser: current.createdUser,
    updatedAt: nowIso(),
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toProgressStageItem(nextRecord),
    }),
  );

  return nextRecord;
}

export async function deleteProgressStageRecord(stageId: string) {
  const current = await getProgressStageRecordById(stageId);
  if (!current) return null;

  await getDynamoDocumentClient().send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: {
        pk: buildProgressStagePk(stageId),
        sk: PROGRESS_STAGE_SK,
      },
    }),
  );

  return current;
}
