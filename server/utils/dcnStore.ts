import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { toLocalDate } from "~/server/utils/datetime";
import { formatAuditUserEmail } from "~/server/utils/createdBy";
import { getAwsRegion } from "~/server/utils/appFilesStorage";
import { getAppUserRecordById } from "~/server/utils/appUserStore";

export type DcnFlow = "in" | "out";

export type DcnRecord = {
  id: string;
  letterDate: string;
  number: string;
  type: string | null;
  toAddress: string | null;
  fromAddress: string | null;
  subject: string | null;
  flow: DcnFlow;
  createdUser: string | null;
  updatedUser: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DcnListItem = DcnRecord & {
  createdBy: string | null;
  updatedBy: string | null;
};

type DcnItem = DcnRecord & {
  pk: string;
  sk: "META";
  gsi1pk: string;
  gsi1sk: string;
  entityType: "DCN";
  stage: string;
};

const DCN_SK = "META";
const DCN_ENTITY = "DCN";

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

function buildDcnPk(dcnId: string) {
  return `DCN#${dcnId}`;
}

function normalizeNullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeFlow(value: unknown): DcnFlow {
  return String(value ?? "in").trim().toLowerCase() === "out" ? "out" : "in";
}

function normalizeLetterDate(value: unknown) {
  const text = String(value ?? "").trim();
  return toLocalDate(text) ?? text;
}

function normalizeDcnRecord(
  record: Partial<DcnRecord> & {
    id: string;
  },
): DcnRecord {
  const createdAt = String(record.createdAt ?? nowIso());
  const updatedAt = String(record.updatedAt ?? createdAt);

  return {
    id: String(record.id),
    letterDate: normalizeLetterDate(record.letterDate),
    number: String(record.number ?? "").trim(),
    type: normalizeNullableText(record.type),
    toAddress: normalizeNullableText(record.toAddress),
    fromAddress: normalizeNullableText(record.fromAddress),
    subject: normalizeNullableText(record.subject),
    flow: normalizeFlow(record.flow),
    createdUser: normalizeNullableText(record.createdUser),
    updatedUser: normalizeNullableText(record.updatedUser),
    createdAt,
    updatedAt,
  };
}

function toDcnItem(record: DcnRecord): DcnItem {
  const normalized = normalizeDcnRecord(record);

  return {
    pk: buildDcnPk(normalized.id),
    sk: DCN_SK,
    gsi1pk: `DCN_FLOW#${normalized.flow}`,
    gsi1sk: `LETTER_DATE#${normalized.letterDate}#${normalized.id}`,
    entityType: DCN_ENTITY,
    stage: getStageName(),
    ...normalized,
  };
}

function mapDcnItem(item: DcnItem): DcnRecord {
  return normalizeDcnRecord(item);
}

async function scanAllDcnItems() {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const items: DcnItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": DCN_ENTITY,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as DcnItem[]));
    exclusiveStartKey = response.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (exclusiveStartKey);

  return items;
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

async function enrichDcnList(records: DcnRecord[]): Promise<DcnListItem[]> {
  const auditEmailMap = await buildAuditEmailMap(
    records.flatMap((record) => [record.createdUser ?? "", record.updatedUser ?? ""]),
  );

  return records.map((record) => ({
    ...record,
    createdBy: record.createdUser ? auditEmailMap.get(record.createdUser) ?? null : null,
    updatedBy: record.updatedUser ? auditEmailMap.get(record.updatedUser) ?? null : null,
  }));
}

export async function getDcnRecordById(dcnId: string) {
  const client = getDynamoDocumentClient();
  const tableName = getTableName();
  const response = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: buildDcnPk(dcnId),
        sk: DCN_SK,
      },
    }),
  );

  const item = response.Item as DcnItem | undefined;
  return item ? mapDcnItem(item) : null;
}

export async function getDcnListItemById(dcnId: string) {
  const record = await getDcnRecordById(dcnId);
  if (!record) return null;

  const items = await enrichDcnList([record]);
  return items[0] ?? null;
}

export async function listDcnRecords(filters?: {
  search?: string;
  flow?: DcnFlow;
  type?: string;
  year?: number;
}) {
  const search = String(filters?.search ?? "").trim().toLowerCase();
  const exactType = String(filters?.type ?? "").trim();
  const year = Number.isFinite(filters?.year)
    ? String(Math.trunc(Number(filters?.year)))
    : "";

  const records = (await scanAllDcnItems())
    .map(mapDcnItem)
    .filter((record) => {
      if (filters?.flow && record.flow !== filters.flow) {
        return false;
      }

      if (exactType && (record.type ?? "") !== exactType) {
        return false;
      }

      if (year && !record.letterDate.startsWith(`${year}-`)) {
        return false;
      }

      if (!search) return true;

      const haystack = [
        record.number,
        record.type ?? "",
        record.toAddress ?? "",
        record.fromAddress ?? "",
        record.subject ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    })
    .sort((a, b) => {
      const createdCompare = b.createdAt.localeCompare(a.createdAt);
      if (createdCompare !== 0) return createdCompare;
      return b.id.localeCompare(a.id);
    });

  return enrichDcnList(records);
}

export async function createDcnRecord(
  params: Omit<DcnRecord, "id" | "createdAt" | "updatedAt">,
) {
  const createdAt = nowIso();
  const record = normalizeDcnRecord({
    id: randomUUID(),
    ...params,
    createdAt,
    updatedAt: createdAt,
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toDcnItem(record),
    }),
  );

  return record;
}

export async function updateDcnRecord(
  dcnId: string,
  updates: Partial<Omit<DcnRecord, "id" | "createdAt" | "createdUser">>,
) {
  const current = await getDcnRecordById(dcnId);
  if (!current) return null;

  const nextRecord = normalizeDcnRecord({
    ...current,
    ...updates,
    id: current.id,
    createdAt: current.createdAt,
    createdUser: current.createdUser,
    updatedAt: nowIso(),
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toDcnItem(nextRecord),
    }),
  );

  return nextRecord;
}

export async function deleteDcnRecord(dcnId: string) {
  const current = await getDcnRecordById(dcnId);
  if (!current) return null;

  await getDynamoDocumentClient().send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: {
        pk: buildDcnPk(dcnId),
        sk: DCN_SK,
      },
    }),
  );

  return current;
}
