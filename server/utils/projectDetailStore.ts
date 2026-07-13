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
import { listProjectRecords, getProjectRecordById } from "~/server/utils/projectStore";
import { listRegionRecords, getRegionRecordById } from "~/server/utils/regionStore";
import {
  matchesProjectDetailsListFilters,
  type ProjectDetailsFilterRecord,
  type ProjectDetailsListFilterInput,
} from "~/server/utils/projectDetailsListWhere";

export type ProjectDetailStatus =
  | "active"
  | "delay"
  | "closed"
  | "cancelled";

export type ProjectDetailRecord = {
  id: string;
  projectId: string;
  cityKabId: string;
  picArea: string | null;
  lineNumber: number | null;
  systemkey: string;
  neId: string | null;
  materialId: string | null;
  materialName: string | null;
  siteId: string | null;
  siteName: string;
  quantity: number | null;
  uom: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  status: ProjectDetailStatus;
  remarksProjectsDetails: string | null;
  remarksDelay: string | null;
  remarksCancel: string | null;
  taxOut: number | null;
  createdUser: string | null;
  updatedUser: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDetailListItem = ProjectDetailRecord & {
  projectName: string | null;
  poNumber: string | null;
  contractNumber: string | null;
  prScNumber: string | null;
  poDate: string | null;
  deliveryDate: string | null;
  komDate: string | null;
  pm: string | null;
  clientName: string | null;
  cityKabName: string | null;
  subRegionName: string | null;
  regionName: string | null;
  subRegionId: string | null;
  regionId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
};

type ProjectDetailItem = ProjectDetailRecord & {
  pk: string;
  sk: "META";
  gsi1pk: string;
  gsi1sk: string;
  entityType: "PROJECT_DETAIL";
  stage: string;
};

const PROJECT_DETAIL_SK = "META";
const PROJECT_DETAIL_ENTITY = "PROJECT_DETAIL";

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

function buildProjectDetailPk(detailId: string) {
  return `PROJECT_DETAIL#${detailId}`;
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

function normalizeLineNumber(value: unknown) {
  const numberValue = normalizeNullableNumber(value);
  return numberValue == null ? null : Math.trunc(numberValue);
}

function normalizeProjectDetailStatus(value: unknown): ProjectDetailStatus {
  const status = String(value ?? "active").trim().toLowerCase();
  if (
    status === "delay" ||
    status === "closed" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "active";
}

function calculateProjectDetailTotalPrice(input: {
  quantity?: unknown;
  unitPrice?: unknown;
  totalPrice?: unknown;
}) {
  const quantity = normalizeNullableNumber(input.quantity);
  const unitPrice = normalizeNullableNumber(input.unitPrice);
  const directTotal = normalizeNullableNumber(input.totalPrice);

  if (quantity != null && unitPrice != null) {
    return quantity * unitPrice;
  }

  return directTotal;
}

function normalizeProjectDetailRecord(
  detail: Partial<ProjectDetailRecord> & {
    id: string;
    projectId: string;
    cityKabId: string;
    systemkey: string;
    siteName: string;
  },
): ProjectDetailRecord {
  const createdAt = String(detail.createdAt ?? nowIso());
  const updatedAt = String(detail.updatedAt ?? createdAt);

  return {
    id: String(detail.id),
    projectId: String(detail.projectId).trim(),
    cityKabId: String(detail.cityKabId).trim(),
    picArea: normalizeNullableText(detail.picArea),
    lineNumber: normalizeLineNumber(detail.lineNumber),
    systemkey: String(detail.systemkey ?? "").trim(),
    neId: normalizeNullableText(detail.neId),
    materialId: normalizeNullableText(detail.materialId),
    materialName: normalizeNullableText(detail.materialName),
    siteId: normalizeNullableText(detail.siteId),
    siteName: String(detail.siteName ?? "").trim(),
    quantity: normalizeNullableNumber(detail.quantity),
    uom: normalizeNullableText(detail.uom),
    unitPrice: normalizeNullableNumber(detail.unitPrice),
    totalPrice: calculateProjectDetailTotalPrice(detail),
    status: normalizeProjectDetailStatus(detail.status),
    remarksProjectsDetails: normalizeNullableText(detail.remarksProjectsDetails),
    remarksDelay: normalizeNullableText(detail.remarksDelay),
    remarksCancel: normalizeNullableText(detail.remarksCancel),
    taxOut: normalizeNullableNumber(detail.taxOut),
    createdUser: normalizeNullableText(detail.createdUser),
    updatedUser: normalizeNullableText(detail.updatedUser),
    createdAt,
    updatedAt,
  };
}

function toProjectDetailItem(detail: ProjectDetailRecord): ProjectDetailItem {
  const normalized = normalizeProjectDetailRecord(detail);

  return {
    pk: buildProjectDetailPk(normalized.id),
    sk: PROJECT_DETAIL_SK,
    gsi1pk: `PROJECT_DETAIL_PROJECT#${normalized.projectId}`,
    gsi1sk: `SYSTEMKEY#${normalized.systemkey.toLowerCase()}#${normalized.id}`,
    entityType: PROJECT_DETAIL_ENTITY,
    stage: getStageName(),
    ...normalized,
  };
}

function mapProjectDetailItem(item: ProjectDetailItem): ProjectDetailRecord {
  return normalizeProjectDetailRecord(item);
}

function toFilterRecord(detail: ProjectDetailListItem): ProjectDetailsFilterRecord {
  return {
    systemkey: detail.systemkey,
    neId: detail.neId,
    materialName: detail.materialName,
    materialId: detail.materialId,
    siteId: detail.siteId,
    siteName: detail.siteName,
    picArea: detail.picArea,
    uom: detail.uom,
    status: detail.status,
    remarksProjectsDetails: detail.remarksProjectsDetails,
    remarksDelay: detail.remarksDelay,
    remarksCancel: detail.remarksCancel,
    projectName: detail.projectName,
    poNumber: detail.poNumber,
    cityKabName: detail.cityKabName,
    subRegionName: detail.subRegionName,
    regionName: detail.regionName,
    lineNumber: detail.lineNumber,
    quantity: detail.quantity,
    unitPrice: detail.unitPrice,
    totalPrice: detail.totalPrice,
    taxOut: detail.taxOut,
    projectId: detail.projectId,
    cityKabId: detail.cityKabId,
  };
}

async function scanAllProjectDetailItems() {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const items: ProjectDetailItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": PROJECT_DETAIL_ENTITY,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as ProjectDetailItem[]));
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

async function buildProjectMap() {
  const projects = await listProjectRecords();
  return new Map(projects.map((project) => [project.id, project] as const));
}

async function buildRegionMap() {
  const regions = await listRegionRecords();
  return new Map(regions.map((region) => [region.id, region] as const));
}

async function enrichProjectDetailList(
  records: ProjectDetailRecord[],
): Promise<ProjectDetailListItem[]> {
  const [auditEmailMap, projectMap, regionMap] = await Promise.all([
    buildAuditEmailMap(
      records.flatMap((record) => [record.createdUser ?? "", record.updatedUser ?? ""]),
    ),
    buildProjectMap(),
    buildRegionMap(),
  ]);

  return records.map((record) => {
    const project = projectMap.get(record.projectId);
    const city = regionMap.get(record.cityKabId);
    const subRegion = city?.parentId ? regionMap.get(city.parentId) : null;
    const region = subRegion?.parentId ? regionMap.get(subRegion.parentId) : null;

    return {
      ...record,
      projectName: project?.projectName ?? null,
      poNumber: project?.poNumber ?? null,
      contractNumber: project?.contractNumber ?? null,
      prScNumber: project?.prScNumber ?? null,
      poDate: project?.poDate ?? null,
      deliveryDate: project?.deliveryDate ?? null,
      komDate: project?.komDate ?? null,
      pm: project?.pm ?? null,
      clientName: project?.clientName ?? null,
      cityKabName: city?.name ?? null,
      subRegionName: subRegion?.name ?? null,
      regionName: region?.name ?? null,
      subRegionId: subRegion?.id ?? null,
      regionId: region?.id ?? null,
      createdBy: record.createdUser ? auditEmailMap.get(record.createdUser) ?? null : null,
      updatedBy: record.updatedUser ? auditEmailMap.get(record.updatedUser) ?? null : null,
    };
  });
}

async function validateProjectDetailReferences(params: {
  projectId: string;
  cityKabId: string;
}) {
  const [project, city] = await Promise.all([
    getProjectRecordById(params.projectId),
    getRegionRecordById(params.cityKabId),
  ]);

  if (!project) {
    throw createValidationError(`Invalid project reference: ${params.projectId}`);
  }

  if (!city || city.type !== "city_kab") {
    throw createValidationError("Only city_kab type allowed");
  }
}

function createValidationError(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;
  return error;
}

async function ensureUniqueSystemkeys(
  systemkeys: string[],
  excludeDetailId?: string,
) {
  const existing = await scanAllProjectDetailItems();
  const existingMap = new Map(
    existing.map((item) => [String(item.systemkey).trim(), String(item.id)] as const),
  );

  for (const systemkey of systemkeys) {
    const existingId = existingMap.get(systemkey);
    if (existingId && existingId !== excludeDetailId) {
      throw createValidationError(
        excludeDetailId
          ? "Systemkey already exists"
          : `Systemkey already exists: ${systemkey}`,
      );
    }
  }
}

export async function getProjectDetailRecordById(detailId: string) {
  const client = getDynamoDocumentClient();
  const tableName = getTableName();
  const response = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: buildProjectDetailPk(detailId),
        sk: PROJECT_DETAIL_SK,
      },
    }),
  );

  const item = response.Item as ProjectDetailItem | undefined;
  return item ? mapProjectDetailItem(item) : null;
}

export async function getProjectDetailListItemById(detailId: string) {
  const record = await getProjectDetailRecordById(detailId);
  if (!record) return null;

  const items = await enrichProjectDetailList([record]);
  return items[0] ?? null;
}

export async function listProjectDetailRecords(
  filters?: ProjectDetailsListFilterInput,
) {
  const records = (await scanAllProjectDetailItems()).map(mapProjectDetailItem);
  const enriched = await enrichProjectDetailList(records);

  return enriched
    .filter((record) =>
      matchesProjectDetailsListFilters(record, filters ?? {}),
    )
    .sort((a, b) => {
      const createdCompare = b.createdAt.localeCompare(a.createdAt);
      if (createdCompare !== 0) return createdCompare;
      return b.id.localeCompare(a.id);
    });
}

export async function listProjectDetailRegionUsage(cityKabIds: string[]) {
  const citySet = new Set(cityKabIds);
  if (citySet.size === 0) return [];

  return (await scanAllProjectDetailItems())
    .map(mapProjectDetailItem)
    .filter((detail) => citySet.has(detail.cityKabId))
    .map((detail) => ({
      id: detail.id,
      projectId: detail.projectId,
      cityKabId: detail.cityKabId,
      siteName: detail.siteName,
      systemkey: detail.systemkey,
    }));
}

export async function createProjectDetailRecords(
  params: Array<
    Omit<
      ProjectDetailRecord,
      "id" | "createdAt" | "updatedAt" | "totalPrice"
    >
  >,
) {
  const normalizedParams = params.map((detail) =>
    normalizeProjectDetailRecord({
      id: randomUUID(),
      ...detail,
      totalPrice: calculateProjectDetailTotalPrice(detail),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }),
  );

  const systemkeys = normalizedParams.map((detail) => detail.systemkey);
  if (new Set(systemkeys).size !== systemkeys.length) {
    throw createValidationError("Duplicate systemkey in payload");
  }

  await Promise.all(
    normalizedParams.map((detail) =>
      validateProjectDetailReferences({
        projectId: detail.projectId,
        cityKabId: detail.cityKabId,
      }),
    ),
  );

  await ensureUniqueSystemkeys(systemkeys);

  await Promise.all(
    normalizedParams.map((detail) =>
      getDynamoDocumentClient().send(
        new PutCommand({
          TableName: getTableName(),
          Item: toProjectDetailItem(detail),
        }),
      ),
    ),
  );

  return normalizedParams;
}

export async function updateProjectDetailRecord(
  detailId: string,
  updates: Partial<
    Omit<ProjectDetailRecord, "id" | "createdAt" | "createdUser">
  >,
) {
  const current = await getProjectDetailRecordById(detailId);
  if (!current) return null;

  const nextProjectId = String(updates.projectId ?? current.projectId).trim();
  const nextCityKabId = String(updates.cityKabId ?? current.cityKabId).trim();
  const nextSystemkey = String(updates.systemkey ?? current.systemkey).trim();

  await validateProjectDetailReferences({
    projectId: nextProjectId,
    cityKabId: nextCityKabId,
  });

  if (nextSystemkey !== current.systemkey) {
    await ensureUniqueSystemkeys([nextSystemkey], current.id);
  }

  const nextRecord = normalizeProjectDetailRecord({
    ...current,
    ...updates,
    id: current.id,
    projectId: nextProjectId,
    cityKabId: nextCityKabId,
    systemkey: nextSystemkey,
    siteName: updates.siteName ?? current.siteName,
    createdUser: current.createdUser,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
    totalPrice: calculateProjectDetailTotalPrice({
      quantity: updates.quantity ?? current.quantity,
      unitPrice: updates.unitPrice ?? current.unitPrice,
      totalPrice: updates.totalPrice ?? current.totalPrice,
    }),
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toProjectDetailItem(nextRecord),
    }),
  );

  return nextRecord;
}

export async function deleteProjectDetailRecord(detailId: string) {
  const current = await getProjectDetailRecordById(detailId);
  if (!current) return null;

  await getDynamoDocumentClient().send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: {
        pk: buildProjectDetailPk(detailId),
        sk: PROJECT_DETAIL_SK,
      },
    }),
  );

  return current;
}
