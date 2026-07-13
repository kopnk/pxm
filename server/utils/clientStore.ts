import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { formatAuditUserEmail } from "~/server/utils/createdBy";
import { getAwsRegion } from "~/server/utils/appFilesStorage";
import { getAppUserRecordById } from "~/server/utils/appUserStore";

export type ClientAddressMeta = Record<string, unknown> | null;

export type ClientRecord = {
  id: string;
  name: string;
  npwp: string | null;
  bankName: string | null;
  bankAccount: string | null;
  addressText: string | null;
  addressMeta: ClientAddressMeta;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  isActive: boolean;
  createdUser: string | null;
  updatedUser: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientListItem = ClientRecord & {
  createdBy: string | null;
  updatedBy: string | null;
};

type ClientItem = ClientRecord & {
  pk: string;
  sk: "META";
  gsi1pk: string;
  gsi1sk: string;
  entityType: "CLIENT";
  stage: string;
};

const CLIENT_SK = "META";
const CLIENT_ENTITY = "CLIENT";

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

function buildClientPk(clientId: string) {
  return `CLIENT#${clientId}`;
}

function normalizeNullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeClientRecord(client: Partial<ClientRecord> & { id: string }): ClientRecord {
  const createdAt = String(client.createdAt ?? nowIso());
  const updatedAt = String(client.updatedAt ?? createdAt);

  return {
    id: String(client.id),
    name: String(client.name ?? "").trim(),
    npwp: normalizeNullableText(client.npwp),
    bankName: normalizeNullableText(client.bankName),
    bankAccount: normalizeNullableText(client.bankAccount),
    addressText: normalizeNullableText(client.addressText),
    addressMeta:
      client.addressMeta && typeof client.addressMeta === "object"
        ? (client.addressMeta as Record<string, unknown>)
        : null,
    contactName: normalizeNullableText(client.contactName),
    contactPhone: normalizeNullableText(client.contactPhone),
    contactEmail: normalizeNullableText(client.contactEmail),
    signatoryName: normalizeNullableText(client.signatoryName),
    signatoryTitle: normalizeNullableText(client.signatoryTitle),
    isActive: client.isActive !== undefined ? Boolean(client.isActive) : true,
    createdUser: normalizeNullableText(client.createdUser),
    updatedUser: normalizeNullableText(client.updatedUser),
    createdAt,
    updatedAt,
  };
}

function toClientItem(client: ClientRecord): ClientItem {
  const normalized = normalizeClientRecord(client);
  const lowerName = normalized.name.toLowerCase();

  return {
    pk: buildClientPk(normalized.id),
    sk: CLIENT_SK,
    gsi1pk: `CLIENT_ACTIVE#${normalized.isActive ? "1" : "0"}`,
    gsi1sk: `NAME#${lowerName}#${normalized.id}`,
    entityType: CLIENT_ENTITY,
    stage: getStageName(),
    ...normalized,
  };
}

function mapClientItem(item: ClientItem): ClientRecord {
  return normalizeClientRecord(item);
}

async function scanAllClientItems() {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const items: ClientItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": CLIENT_ENTITY,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as ClientItem[]));
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

async function enrichClientList(records: ClientRecord[]): Promise<ClientListItem[]> {
  const auditEmailMap = await buildAuditEmailMap(
    records.flatMap((record) => [record.createdUser ?? "", record.updatedUser ?? ""]),
  );

  return records.map((record) => ({
    ...record,
    createdBy: record.createdUser ? auditEmailMap.get(record.createdUser) ?? null : null,
    updatedBy: record.updatedUser ? auditEmailMap.get(record.updatedUser) ?? null : null,
  }));
}

export async function getClientRecordById(clientId: string) {
  const client = getDynamoDocumentClient();
  const tableName = getTableName();
  const response = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: buildClientPk(clientId),
        sk: CLIENT_SK,
      },
    }),
  );

  const item = response.Item as ClientItem | undefined;
  return item ? mapClientItem(item) : null;
}

export async function listClientRecords(filters?: {
  search?: string;
  isActive?: boolean;
}) {
  const search = String(filters?.search ?? "").trim().toLowerCase();

  const records = (await scanAllClientItems())
    .map(mapClientItem)
    .filter((record) => {
      if (
        filters?.isActive !== undefined &&
        Boolean(record.isActive) !== filters.isActive
      ) {
        return false;
      }

      if (!search) return true;

      const haystack = [
        record.name,
        record.npwp ?? "",
        record.contactName ?? "",
        record.contactEmail ?? "",
        record.contactPhone ?? "",
        record.addressText ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    })
    .sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;

      return a.id.localeCompare(b.id);
    });

  return enrichClientList(records);
}

export async function createClientRecord(
  params: Omit<ClientRecord, "id" | "createdAt" | "updatedAt">,
) {
  const createdAt = nowIso();
  const record = normalizeClientRecord({
    id: randomUUID(),
    ...params,
    createdAt,
    updatedAt: createdAt,
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toClientItem(record),
    }),
  );

  return record;
}

export async function updateClientRecord(
  clientId: string,
  updates: Partial<Omit<ClientRecord, "id" | "createdAt" | "createdUser">>,
) {
  const current = await getClientRecordById(clientId);
  if (!current) return null;

  const nextRecord = normalizeClientRecord({
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
      Item: toClientItem(nextRecord),
    }),
  );

  return nextRecord;
}

export async function deleteClientRecord(clientId: string) {
  const current = await getClientRecordById(clientId);
  if (!current) return null;

  await getDynamoDocumentClient().send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: {
        pk: buildClientPk(clientId),
        sk: CLIENT_SK,
      },
    }),
  );

  return current;
}
