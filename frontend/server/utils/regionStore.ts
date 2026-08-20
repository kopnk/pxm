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

export type RegionType = "region" | "sub_region" | "city_kab";

export type RegionRecord = {
  id: string;
  name: string;
  type: RegionType;
  parentId: string | null;
  createdUser: string | null;
  updatedUser: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RegionListItem = RegionRecord & {
  parentName: string | null;
  regionId: string | null;
  regionName: string | null;
  subRegionId: string | null;
  subRegionName: string | null;
  createdBy: string | null;
  updatedBy: string | null;
};

type RegionItem = RegionRecord & {
  pk: string;
  sk: "META";
  gsi1pk: string;
  gsi1sk: string;
  entityType: "REGION";
  stage: string;
};

const REGION_SK = "META";
const REGION_ENTITY = "REGION";
const REGION_TYPE_SORT_ORDER: Record<RegionType, number> = {
  region: 1,
  sub_region: 2,
  city_kab: 3,
};

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

function buildRegionPk(regionId: string) {
  return `REGION#${regionId}`;
}

function normalizeRegionType(type: string): RegionType {
  if (type === "sub_region" || type === "city_kab") return type;
  return "region";
}

function normalizeRegionName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function createRegionError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function normalizeRegionRecord(region: Partial<RegionRecord> & { id: string }): RegionRecord {
  const createdAt = String(region.createdAt ?? nowIso());
  const updatedAt = String(region.updatedAt ?? createdAt);

  return {
    id: String(region.id),
    name: String(region.name ?? "").trim(),
    type: normalizeRegionType(String(region.type ?? "region")),
    parentId: region.parentId ? String(region.parentId) : null,
    createdUser: region.createdUser ? String(region.createdUser) : null,
    updatedUser: region.updatedUser ? String(region.updatedUser) : null,
    createdAt,
    updatedAt,
  };
}

function toRegionItem(region: RegionRecord): RegionItem {
  const normalized = normalizeRegionRecord(region);
  const parentId = normalized.parentId ?? "ROOT";
  const lowerName = normalized.name.toLowerCase();

  return {
    pk: buildRegionPk(normalized.id),
    sk: REGION_SK,
    gsi1pk: `REGION_TYPE#${normalized.type}`,
    gsi1sk: `PARENT#${parentId}#NAME#${lowerName}#${normalized.id}`,
    entityType: REGION_ENTITY,
    stage: getStageName(),
    ...normalized,
  };
}

function mapRegionItem(item: RegionItem): RegionRecord {
  return normalizeRegionRecord(item);
}

async function scanAllRegionItems() {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const items: RegionItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": REGION_ENTITY,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as RegionItem[]));
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

async function enrichRegionList(
  records: RegionRecord[],
  allRecords = records,
): Promise<RegionListItem[]> {
  const recordMap = new Map(allRecords.map((record) => [record.id, record]));
  const auditEmailMap = await buildAuditEmailMap(
    records.flatMap((record) => [record.createdUser ?? "", record.updatedUser ?? ""]),
  );

  return records.map((record) => ({
    ...record,
    ...resolveRegionHierarchy(record, recordMap),
    createdBy: record.createdUser ? auditEmailMap.get(record.createdUser) ?? null : null,
    updatedBy: record.updatedUser ? auditEmailMap.get(record.updatedUser) ?? null : null,
  }));
}

function resolveRegionHierarchy(
  record: RegionRecord,
  recordMap: Map<string, RegionRecord>,
) {
  const parent = record.parentId ? recordMap.get(record.parentId) ?? null : null;
  const grandParent = parent?.parentId
    ? recordMap.get(parent.parentId) ?? null
    : null;

  if (record.type === "region") {
    return {
      parentName: null,
      regionId: record.id,
      regionName: record.name,
      subRegionId: null,
      subRegionName: null,
    };
  }

  if (record.type === "sub_region") {
    return {
      parentName: parent?.name ?? null,
      regionId: parent?.type === "region" ? parent.id : null,
      regionName: parent?.type === "region" ? parent.name : null,
      subRegionId: record.id,
      subRegionName: record.name,
    };
  }

  return {
    parentName: parent?.name ?? null,
    regionId: grandParent?.type === "region" ? grandParent.id : null,
    regionName: grandParent?.type === "region" ? grandParent.name : null,
    subRegionId: parent?.type === "sub_region" ? parent.id : null,
    subRegionName: parent?.type === "sub_region" ? parent.name : null,
  };
}

function matchesRegionHierarchyFilter(
  record: RegionRecord,
  hierarchy: ReturnType<typeof resolveRegionHierarchy>,
  filters: {
    regionId?: string;
    subRegionId?: string;
    cityKabId?: string;
  },
) {
  if (filters.cityKabId && record.id !== filters.cityKabId) {
    return false;
  }

  if (filters.subRegionId) {
    const matchesSubRegion =
      record.id === filters.subRegionId ||
      hierarchy.subRegionId === filters.subRegionId;
    if (!matchesSubRegion) return false;
  }

  if (filters.regionId) {
    const matchesRegion =
      record.id === filters.regionId ||
      hierarchy.regionId === filters.regionId;
    if (!matchesRegion) return false;
  }

  return true;
}

async function assertRegionNameAvailable(params: {
  name: string;
  type: RegionType;
  parentId: string | null;
  excludeId?: string;
}) {
  const normalizedName = normalizeRegionName(params.name);
  const normalizedParentId = params.type === "region" ? null : params.parentId;
  const existing = (await scanAllRegionItems())
    .map(mapRegionItem)
    .find((record) => {
      if (record.id === params.excludeId) return false;
      return (
        record.type === params.type &&
        (record.parentId ?? null) === normalizedParentId &&
        normalizeRegionName(record.name) === normalizedName
      );
    });

  if (existing) {
    throw createRegionError(
      409,
      "Region name already exists for the selected type and parent",
    );
  }
}

export async function getRegionRecordById(regionId: string) {
  const client = getDynamoDocumentClient();
  const tableName = getTableName();
  const response = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: buildRegionPk(regionId),
        sk: REGION_SK,
      },
    }),
  );

  const item = response.Item as RegionItem | undefined;
  return item ? mapRegionItem(item) : null;
}

export async function listRegionRecords(filters?: {
  search?: string;
  type?: string;
  parentId?: string;
  regionId?: string;
  subRegionId?: string;
  cityKabId?: string;
}) {
  const search = String(filters?.search ?? "").trim().toLowerCase();
  const type = String(filters?.type ?? "").trim().toLowerCase();
  const parentId = String(filters?.parentId ?? "").trim();
  const regionId = String(filters?.regionId ?? "").trim();
  const subRegionId = String(filters?.subRegionId ?? "").trim();
  const cityKabId = String(filters?.cityKabId ?? "").trim();

  const records = (await scanAllRegionItems()).map(mapRegionItem);
  const recordMap = new Map(records.map((record) => [record.id, record]));

  const filtered = records
    .filter((record) => {
      const hierarchy = resolveRegionHierarchy(record, recordMap);
      if (type && record.type !== type) return false;

      if (parentId) {
        if (record.parentId !== parentId) return false;
      }

      if (
        !matchesRegionHierarchyFilter(record, hierarchy, {
          regionId,
          subRegionId,
          cityKabId,
        })
      ) {
        return false;
      }

      const searchable = [
        record.name,
        hierarchy.parentName,
        hierarchy.regionName,
        hierarchy.subRegionName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (search && !searchable.includes(search)) return false;

      return true;
    })
    .sort((a, b) => {
      const typeCompare =
        REGION_TYPE_SORT_ORDER[a.type] - REGION_TYPE_SORT_ORDER[b.type];
      if (typeCompare !== 0) return typeCompare;

      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;

      return a.id.localeCompare(b.id);
    });

  return enrichRegionList(filtered, records);
}

export async function listRegionOptions(filters?: {
  type?: string;
  parentId?: string;
  limit?: number;
}) {
  const records = await listRegionRecords({
    type: filters?.type,
    parentId: filters?.parentId,
  });

  const limit = Math.max(1, Number(filters?.limit ?? 1000));

  return records.slice(0, limit).map((record) => ({
    id: record.id,
    name: record.name,
    type: record.type,
  }));
}

export async function createRegionRecord(params: {
  name: string;
  type: RegionType;
  parentId?: string | null;
  createdUser?: string | null;
  updatedUser?: string | null;
}) {
  const createdAt = nowIso();
  const parentId = params.type === "region" ? null : (params.parentId ?? null);
  await assertRegionNameAvailable({
    name: params.name,
    type: params.type,
    parentId,
  });

  const record = normalizeRegionRecord({
    id: randomUUID(),
    name: params.name,
    type: params.type,
    parentId,
    createdUser: params.createdUser ?? null,
    updatedUser: params.updatedUser ?? params.createdUser ?? null,
    createdAt,
    updatedAt: createdAt,
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toRegionItem(record),
    }),
  );

  return record;
}

export async function updateRegionRecord(
  regionId: string,
  updates: Partial<Omit<RegionRecord, "id" | "createdAt" | "createdUser">>,
) {
  const current = await getRegionRecordById(regionId);
  if (!current) return null;

  const nextType = normalizeRegionType(String(updates.type ?? current.type));
  const nextRecord = normalizeRegionRecord({
    ...current,
    ...updates,
    id: current.id,
    type: nextType,
    parentId:
      nextType === "region"
        ? null
        : updates.parentId !== undefined
          ? updates.parentId
          : current.parentId,
    createdUser: current.createdUser,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  });

  await assertRegionNameAvailable({
    name: nextRecord.name,
    type: nextRecord.type,
    parentId: nextRecord.parentId,
    excludeId: current.id,
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toRegionItem(nextRecord),
    }),
  );

  return nextRecord;
}

export async function getRegionCascadeIds(regionId: string) {
  const allRecords = (await scanAllRegionItems()).map(mapRegionItem);
  const target = allRecords.find((record) => record.id === regionId) ?? null;

  if (!target) return null;

  const descendants = new Set<string>();
  const queue = [regionId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || descendants.has(currentId)) continue;

    descendants.add(currentId);

    for (const record of allRecords) {
      if (record.parentId === currentId) {
        queue.push(record.id);
      }
    }
  }

  return {
    target,
    ids: [...descendants],
  };
}

export async function deleteRegionRecordCascade(regionId: string) {
  const cascade = await getRegionCascadeIds(regionId);
  if (!cascade) return null;

  await Promise.all(
    cascade.ids.map((id) =>
      getDynamoDocumentClient().send(
        new DeleteCommand({
          TableName: getTableName(),
          Key: {
            pk: buildRegionPk(id),
            sk: REGION_SK,
          },
        }),
      ),
    ),
  );

  return {
    deleted: cascade.target,
    deletedIds: cascade.ids,
  };
}
