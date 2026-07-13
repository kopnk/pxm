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

export type PartnerAddressMeta = Record<string, unknown> | null;

export type PartnerRecord = {
  id: string;
  name: string;
  npwp: string | null;
  bankName: string | null;
  bankAccount: string | null;
  partnerType: string | null;
  addressText: string | null;
  addressMeta: PartnerAddressMeta;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  rating: number | null;
  isActive: boolean;
  createdUser: string | null;
  updatedUser: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PartnerListItem = PartnerRecord & {
  createdBy: string | null;
  updatedBy: string | null;
};

type PartnerItem = PartnerRecord & {
  pk: string;
  sk: "META";
  gsi1pk: string;
  gsi1sk: string;
  entityType: "PARTNER";
  stage: string;
};

const PARTNER_SK = "META";
const PARTNER_ENTITY = "PARTNER";

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

function buildPartnerPk(partnerId: string) {
  return `PARTNER#${partnerId}`;
}

function normalizeNullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeRating(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const rating = Number(value);
  return Number.isFinite(rating) ? rating : null;
}

function normalizePartnerRecord(
  partner: Partial<PartnerRecord> & { id: string },
): PartnerRecord {
  const createdAt = String(partner.createdAt ?? nowIso());
  const updatedAt = String(partner.updatedAt ?? createdAt);

  return {
    id: String(partner.id),
    name: String(partner.name ?? "").trim(),
    npwp: normalizeNullableText(partner.npwp),
    bankName: normalizeNullableText(partner.bankName),
    bankAccount: normalizeNullableText(partner.bankAccount),
    partnerType: normalizeNullableText(partner.partnerType),
    addressText: normalizeNullableText(partner.addressText),
    addressMeta:
      partner.addressMeta && typeof partner.addressMeta === "object"
        ? (partner.addressMeta as Record<string, unknown>)
        : null,
    contactName: normalizeNullableText(partner.contactName),
    contactPhone: normalizeNullableText(partner.contactPhone),
    contactEmail: normalizeNullableText(partner.contactEmail),
    signatoryName: normalizeNullableText(partner.signatoryName),
    signatoryTitle: normalizeNullableText(partner.signatoryTitle),
    rating: normalizeRating(partner.rating),
    isActive: partner.isActive !== undefined ? Boolean(partner.isActive) : true,
    createdUser: normalizeNullableText(partner.createdUser),
    updatedUser: normalizeNullableText(partner.updatedUser),
    createdAt,
    updatedAt,
  };
}

function toPartnerItem(partner: PartnerRecord): PartnerItem {
  const normalized = normalizePartnerRecord(partner);
  const lowerName = normalized.name.toLowerCase();

  return {
    pk: buildPartnerPk(normalized.id),
    sk: PARTNER_SK,
    gsi1pk: `PARTNER_ACTIVE#${normalized.isActive ? "1" : "0"}`,
    gsi1sk: `NAME#${lowerName}#${normalized.id}`,
    entityType: PARTNER_ENTITY,
    stage: getStageName(),
    ...normalized,
  };
}

function mapPartnerItem(item: PartnerItem): PartnerRecord {
  return normalizePartnerRecord(item);
}

async function scanAllPartnerItems() {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const items: PartnerItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": PARTNER_ENTITY,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as PartnerItem[]));
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

async function enrichPartnerList(records: PartnerRecord[]): Promise<PartnerListItem[]> {
  const auditEmailMap = await buildAuditEmailMap(
    records.flatMap((record) => [record.createdUser ?? "", record.updatedUser ?? ""]),
  );

  return records.map((record) => ({
    ...record,
    createdBy: record.createdUser ? auditEmailMap.get(record.createdUser) ?? null : null,
    updatedBy: record.updatedUser ? auditEmailMap.get(record.updatedUser) ?? null : null,
  }));
}

export async function getPartnerRecordById(partnerId: string) {
  const client = getDynamoDocumentClient();
  const tableName = getTableName();
  const response = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: buildPartnerPk(partnerId),
        sk: PARTNER_SK,
      },
    }),
  );

  const item = response.Item as PartnerItem | undefined;
  return item ? mapPartnerItem(item) : null;
}

export async function listPartnerRecords(filters?: {
  search?: string;
  isActive?: boolean;
}) {
  const search = String(filters?.search ?? "").trim().toLowerCase();

  const records = (await scanAllPartnerItems())
    .map(mapPartnerItem)
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
        record.partnerType ?? "",
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

  return enrichPartnerList(records);
}

export async function createPartnerRecord(
  params: Omit<PartnerRecord, "id" | "createdAt" | "updatedAt">,
) {
  const createdAt = nowIso();
  const record = normalizePartnerRecord({
    id: randomUUID(),
    ...params,
    createdAt,
    updatedAt: createdAt,
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toPartnerItem(record),
    }),
  );

  return record;
}

export async function updatePartnerRecord(
  partnerId: string,
  updates: Partial<Omit<PartnerRecord, "id" | "createdAt" | "createdUser">>,
) {
  const current = await getPartnerRecordById(partnerId);
  if (!current) return null;

  const nextRecord = normalizePartnerRecord({
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
      Item: toPartnerItem(nextRecord),
    }),
  );

  return nextRecord;
}

export async function deletePartnerRecord(partnerId: string) {
  const current = await getPartnerRecordById(partnerId);
  if (!current) return null;

  await getDynamoDocumentClient().send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: {
        pk: buildPartnerPk(partnerId),
        sk: PARTNER_SK,
      },
    }),
  );

  return current;
}
