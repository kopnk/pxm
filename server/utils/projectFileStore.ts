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

export type ProjectFileRecord = {
  id: string;
  refTable: string;
  refId: string;
  fileCategory: string;
  fileName: string | null;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  version: number;
  uploadedBy: string | null;
  uploadedAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  restoredAt: string | null;
  isArchived: boolean;
};

type ProjectFileItem = ProjectFileRecord & {
  pk: string;
  sk: "META";
  gsi1pk: string;
  gsi1sk: string;
  entityType: "PROJECT_FILE";
  stage: string;
};

const PROJECT_FILE_SK = "META";
const PROJECT_FILE_ENTITY = "PROJECT_FILE";

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

function buildProjectFilePk(fileId: string) {
  return `PROJECT_FILE#${fileId}`;
}

function normalizeNullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeVersion(value: unknown) {
  const version = Number(value);
  if (!Number.isFinite(version) || version <= 0) {
    return 1;
  }

  return Math.trunc(version);
}

function normalizeProjectFileRecord(
  record: Partial<ProjectFileRecord> & {
    id: string;
    refTable: string;
    refId: string;
    fileCategory: string;
    fileUrl: string;
  },
): ProjectFileRecord {
  const uploadedAt = String(record.uploadedAt ?? nowIso());

  return {
    id: String(record.id),
    refTable: String(record.refTable ?? "").trim(),
    refId: String(record.refId ?? "").trim(),
    fileCategory: String(record.fileCategory ?? "").trim(),
    fileName: normalizeNullableText(record.fileName),
    fileUrl: String(record.fileUrl ?? "").trim(),
    fileSize: normalizeNullableNumber(record.fileSize),
    mimeType: normalizeNullableText(record.mimeType),
    version: normalizeVersion(record.version),
    uploadedBy: normalizeNullableText(record.uploadedBy),
    uploadedAt,
    deletedAt: normalizeNullableText(record.deletedAt),
    deletedBy: normalizeNullableText(record.deletedBy),
    restoredAt: normalizeNullableText(record.restoredAt),
    isArchived: record.isArchived === undefined ? false : Boolean(record.isArchived),
  };
}

function toProjectFileItem(record: ProjectFileRecord): ProjectFileItem {
  const normalized = normalizeProjectFileRecord(record);

  return {
    pk: buildProjectFilePk(normalized.id),
    sk: PROJECT_FILE_SK,
    gsi1pk: `PROJECT_FILE_REF#${normalized.refTable}#${normalized.refId}`,
    gsi1sk: `UPLOADED_AT#${normalized.uploadedAt}#${normalized.id}`,
    entityType: PROJECT_FILE_ENTITY,
    stage: getStageName(),
    ...normalized,
  };
}

function mapProjectFileItem(item: ProjectFileItem): ProjectFileRecord {
  return normalizeProjectFileRecord(item);
}

async function scanAllProjectFileItems() {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const items: ProjectFileItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": PROJECT_FILE_ENTITY,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as ProjectFileItem[]));
    exclusiveStartKey = response.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (exclusiveStartKey);

  return items;
}

export async function getProjectFileRecordById(fileId: string) {
  const client = getDynamoDocumentClient();
  const tableName = getTableName();
  const response = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: buildProjectFilePk(fileId),
        sk: PROJECT_FILE_SK,
      },
    }),
  );

  const item = response.Item as ProjectFileItem | undefined;
  return item ? mapProjectFileItem(item) : null;
}

export async function listProjectFileRecords(filters?: {
  search?: string;
  refTable?: string;
  refId?: string;
  fileCategory?: string;
  includeDeleted?: boolean;
}) {
  const search = String(filters?.search ?? "").trim().toLowerCase();
  const refTable = String(filters?.refTable ?? "").trim();
  const refId = String(filters?.refId ?? "").trim();
  const fileCategory = String(filters?.fileCategory ?? "").trim();

  return (await scanAllProjectFileItems())
    .map(mapProjectFileItem)
    .filter((record) => {
      if (!filters?.includeDeleted && record.deletedAt) {
        return false;
      }

      if (refTable && record.refTable !== refTable) {
        return false;
      }

      if (refId && record.refId !== refId) {
        return false;
      }

      if (fileCategory && record.fileCategory !== fileCategory) {
        return false;
      }

      if (!search) return true;

      const haystack = [
        record.fileName ?? "",
        record.fileUrl,
        record.fileCategory,
        record.mimeType ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    })
    .sort((a, b) => {
      const uploadedCompare = b.uploadedAt.localeCompare(a.uploadedAt);
      if (uploadedCompare !== 0) return uploadedCompare;
      return b.id.localeCompare(a.id);
    });
}

export async function createProjectFileRecord(
  params: Omit<ProjectFileRecord, "id" | "uploadedAt" | "deletedAt" | "deletedBy" | "restoredAt"> & {
    uploadedAt?: string;
    deletedAt?: string | null;
    deletedBy?: string | null;
    restoredAt?: string | null;
  },
) {
  const record = normalizeProjectFileRecord({
    id: randomUUID(),
    ...params,
    uploadedAt: params.uploadedAt ?? nowIso(),
    deletedAt: params.deletedAt ?? null,
    deletedBy: params.deletedBy ?? null,
    restoredAt: params.restoredAt ?? null,
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toProjectFileItem(record),
    }),
  );

  return record;
}

export async function updateProjectFileRecord(
  fileId: string,
  updates: Partial<Omit<ProjectFileRecord, "id" | "uploadedAt" | "uploadedBy">>,
) {
  const current = await getProjectFileRecordById(fileId);
  if (!current) return null;

  const nextRecord = normalizeProjectFileRecord({
    ...current,
    ...updates,
    id: current.id,
    refTable: current.refTable,
    refId: current.refId,
    fileCategory: String(updates.fileCategory ?? current.fileCategory),
    fileUrl: String(updates.fileUrl ?? current.fileUrl),
    uploadedAt: current.uploadedAt,
    uploadedBy: current.uploadedBy,
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toProjectFileItem(nextRecord),
    }),
  );

  return nextRecord;
}

export async function hardDeleteProjectFileRecord(fileId: string) {
  const current = await getProjectFileRecordById(fileId);
  if (!current) return null;

  await getDynamoDocumentClient().send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: {
        pk: buildProjectFilePk(fileId),
        sk: PROJECT_FILE_SK,
      },
    }),
  );

  return current;
}
