import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { formatAuditUserEmail } from "~/server/utils/createdBy";
import { toLocalDate } from "~/server/utils/datetime";
import { pfListLineBase, pfPartnerLineTotal } from "~/lib/projectFinancialsMath";
import { getAwsRegion } from "~/server/utils/appFilesStorage";
import { getAppUserRecordById } from "~/server/utils/appUserStore";
import { getClientRecordById, listClientRecords } from "~/server/utils/clientStore";
import {
  matchesProjectsListFilters,
  type ProjectListFilterRecord,
  type ProjectsListFilterInput,
} from "~/server/utils/projectsListWhere";

export type ProjectStatus = "active" | "closed" | "cancelled";

export type ProjectRecord = {
  id: string;
  contractNumber: string | null;
  prScNumber: string;
  poNumber: string;
  poDate: string | null;
  deliveryDate: string | null;
  komDate: string | null;
  projectName: string;
  subTotal: number;
  discount: number;
  netPrice: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  status: ProjectStatus;
  pm: string | null;
  clientId: string | null;
  createdUser: string | null;
  updatedUser: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectListItem = ProjectRecord & {
  clientName: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  hpp: number;
  dpp: number;
  mrg: number;
  stageData: unknown[];
};

type ProjectItem = ProjectRecord & {
  pk: string;
  sk: "META";
  gsi1pk: string;
  gsi1sk: string;
  entityType: "PROJECT";
  stage: string;
};

type ProjectFinancialCostItem = {
  entityType?: string;
  projectId?: string | null;
  flowDirection?: string | null;
  qtyPartner?: number | null;
  unitPricePartner?: number | null;
  qtyClient?: number | null;
  unitPriceClient?: number | null;
  pph?: number | null;
  taxIn?: number | null;
};

const PROJECT_SK = "META";
const PROJECT_ENTITY = "PROJECT";
const PROJECT_FINANCIAL_ENTITY = "PROJECT_FINANCIAL";

let dynamoClient: DynamoDBDocumentClient | null = null;

function nowIso() {
  return new Date().toISOString();
}

export function calculateProjectAmounts(input: {
  subTotal?: unknown;
  discount?: unknown;
  vatRate?: unknown;
}) {
  const subTotal = normalizeNumber(input.subTotal, 0);
  const discount = normalizeNumber(input.discount, 0);
  const vatRate = normalizeNumber(input.vatRate, 11);
  const netPrice = subTotal - discount;
  const vatAmount = (netPrice * vatRate) / 100;
  const grandTotal = netPrice + vatAmount;

  return {
    subTotal,
    discount,
    vatRate,
    netPrice,
    vatAmount,
    grandTotal,
  };
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

function buildProjectPk(projectId: string) {
  return `PROJECT#${projectId}`;
}

function normalizeNullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeDateValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return toLocalDate(String(value)) ?? null;
}

function normalizeNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeProjectStatus(value: unknown): ProjectStatus {
  const status = String(value ?? "active").trim().toLowerCase();
  if (status === "closed" || status === "cancelled") {
    return status;
  }
  return "active";
}

function normalizeProjectRecord(
  project: Partial<ProjectRecord> & { id: string },
): ProjectRecord {
  const createdAt = String(project.createdAt ?? nowIso());
  const updatedAt = String(project.updatedAt ?? createdAt);
  const amounts = calculateProjectAmounts({
    subTotal: project.subTotal,
    discount: project.discount,
    vatRate: project.vatRate,
  });

  return {
    id: String(project.id),
    contractNumber: normalizeNullableText(project.contractNumber),
    prScNumber: String(project.prScNumber ?? "").trim(),
    poNumber: String(project.poNumber ?? "").trim(),
    poDate: normalizeDateValue(project.poDate),
    deliveryDate: normalizeDateValue(project.deliveryDate),
    komDate: normalizeDateValue(project.komDate),
    projectName: String(project.projectName ?? "").trim(),
    subTotal: amounts.subTotal,
    discount: amounts.discount,
    netPrice: normalizeNumber(project.netPrice, amounts.netPrice),
    vatRate: amounts.vatRate,
    vatAmount: normalizeNumber(project.vatAmount, amounts.vatAmount),
    grandTotal: normalizeNumber(project.grandTotal, amounts.grandTotal),
    status: normalizeProjectStatus(project.status),
    pm: normalizeNullableText(project.pm),
    clientId: normalizeNullableText(project.clientId),
    createdUser: normalizeNullableText(project.createdUser),
    updatedUser: normalizeNullableText(project.updatedUser),
    createdAt,
    updatedAt,
  };
}

function toProjectItem(project: ProjectRecord): ProjectItem {
  const normalized = normalizeProjectRecord(project);

  return {
    pk: buildProjectPk(normalized.id),
    sk: PROJECT_SK,
    gsi1pk: `PROJECT_STATUS#${normalized.status}`,
    gsi1sk: `CREATED_AT#${normalized.createdAt}#${normalized.id}`,
    entityType: PROJECT_ENTITY,
    stage: getStageName(),
    ...normalized,
  };
}

function mapProjectItem(item: ProjectItem): ProjectRecord {
  return normalizeProjectRecord(item);
}

function toFilterRecord(
  project: ProjectRecord,
  clientName: string | null,
): ProjectListFilterRecord {
  return {
    projectName: project.projectName,
    poNumber: project.poNumber,
    prScNumber: project.prScNumber,
    contractNumber: project.contractNumber,
    pm: project.pm,
    status: project.status,
    clientName,
    poDate: project.poDate,
    deliveryDate: project.deliveryDate,
    komDate: project.komDate,
    subTotal: project.subTotal,
    discount: project.discount,
    netPrice: project.netPrice,
    vatRate: project.vatRate,
    vatAmount: project.vatAmount,
    grandTotal: project.grandTotal,
  };
}

async function queryProjectItemsByStatus(status: ProjectStatus) {
  const response = await getDynamoDocumentClient().send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :gsi1pk",
      ExpressionAttributeValues: {
        ":gsi1pk": `PROJECT_STATUS#${status}`,
      },
    }),
  );

  return (response.Items ?? []) as ProjectItem[];
}

async function listProjectItemsForFilters(filters?: ProjectsListFilterInput) {
  const status = filters?.status as ProjectStatus | undefined;
  if (status) {
    return queryProjectItemsByStatus(status);
  }

  const statuses: ProjectStatus[] = ["active", "closed", "cancelled"];
  const grouped = await Promise.all(statuses.map(queryProjectItemsByStatus));
  return grouped.flat();
}

async function scanAllProjectFinancialCostItems() {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const items: ProjectFinancialCostItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": PROJECT_FINANCIAL_ENTITY,
        },
        ProjectionExpression:
          "entityType, projectId, flowDirection, qtyPartner, unitPricePartner, qtyClient, unitPriceClient, pph, taxIn",
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as ProjectFinancialCostItem[]));
    exclusiveStartKey = response.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (exclusiveStartKey);

  return items;
}

async function buildProjectFinancialSummaryMap() {
  const financials = await scanAllProjectFinancialCostItems();
  const summaryMap = new Map<string, { hpp: number; dpp: number }>();

  for (const item of financials) {
    const projectId = String(item.projectId ?? "").trim();
    if (!projectId) continue;
    const summary = summaryMap.get(projectId) ?? { hpp: 0, dpp: 0 };

    if (item.flowDirection === "in") {
      summary.hpp +=
        pfPartnerLineTotal(
          item.qtyPartner,
          item.unitPricePartner,
          item.pph,
          item.taxIn,
        ) ?? 0;
    }

    if (item.flowDirection === "out") {
      summary.dpp +=
        pfListLineBase(
          item.qtyClient,
          item.unitPriceClient,
        ) ?? 0;
    }

    summaryMap.set(projectId, summary);
  }

  return summaryMap;
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

async function buildClientNameMap() {
  const clients = await listClientRecords();
  return new Map(clients.map((client) => [client.id, client.name] as const));
}

async function enrichProjectList(
  records: ProjectRecord[],
  clientNameMap: Map<string, string>,
): Promise<ProjectListItem[]> {
  const [auditEmailMap, financialSummaryMap] = await Promise.all([
    buildAuditEmailMap(
      records.flatMap((record) => [record.createdUser ?? "", record.updatedUser ?? ""]),
    ),
    buildProjectFinancialSummaryMap(),
  ]);

  return records.map((record) => {
    const clientName = record.clientId
      ? clientNameMap.get(record.clientId) ?? null
      : null;
    const financialSummary = financialSummaryMap.get(record.id);
    const hpp = financialSummary?.hpp ?? 0;
    const dpp = financialSummary?.dpp ?? 0;
    const mrg = dpp > 0 ? ((dpp - hpp) / dpp) * 100 : 0;

    return {
      ...record,
      clientName,
      createdBy: record.createdUser ? auditEmailMap.get(record.createdUser) ?? null : null,
      updatedBy: record.updatedUser ? auditEmailMap.get(record.updatedUser) ?? null : null,
      hpp,
      dpp,
      mrg,
      stageData: [],
    };
  });
}

export async function getProjectRecordById(projectId: string) {
  const client = getDynamoDocumentClient();
  const tableName = getTableName();
  const response = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: buildProjectPk(projectId),
        sk: PROJECT_SK,
      },
    }),
  );

  const item = response.Item as ProjectItem | undefined;
  return item ? mapProjectItem(item) : null;
}

export async function getProjectListItemById(projectId: string) {
  const record = await getProjectRecordById(projectId);
  if (!record) return null;

  const clientRecord = record.clientId
    ? await getClientRecordById(record.clientId)
    : null;
  const items = await enrichProjectList(
    [record],
    new Map(
      clientRecord?.id && clientRecord.name
        ? [[clientRecord.id, clientRecord.name] as const]
        : [],
    ),
  );

  return items[0] ?? null;
}

export async function listProjectRecords(filters?: ProjectsListFilterInput) {
  const records = (await listProjectItemsForFilters(filters)).map(mapProjectItem);
  const clientNameMap = await buildClientNameMap();

  const filtered = records
    .filter((record) =>
      matchesProjectsListFilters(
        toFilterRecord(
          record,
          record.clientId ? clientNameMap.get(record.clientId) ?? null : null,
        ),
        filters ?? {},
      ),
    )
    .sort((a, b) => {
      const createdCompare = b.createdAt.localeCompare(a.createdAt);
      if (createdCompare !== 0) return createdCompare;
      return b.id.localeCompare(a.id);
    });

  return enrichProjectList(filtered, clientNameMap);
}

export async function createProjectRecord(
  params: Omit<ProjectRecord, "id" | "createdAt" | "updatedAt" | "netPrice" | "vatAmount" | "grandTotal">,
) {
  const createdAt = nowIso();
  const amounts = calculateProjectAmounts(params);
  const record = normalizeProjectRecord({
    id: randomUUID(),
    ...params,
    ...amounts,
    createdAt,
    updatedAt: createdAt,
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toProjectItem(record),
    }),
  );

  return record;
}

export async function updateProjectRecord(
  projectId: string,
  updates: Partial<Omit<ProjectRecord, "id" | "createdAt" | "createdUser" | "netPrice" | "vatAmount" | "grandTotal">>,
) {
  const current = await getProjectRecordById(projectId);
  if (!current) return null;

  const amounts = calculateProjectAmounts({
    subTotal: updates.subTotal ?? current.subTotal,
    discount: updates.discount ?? current.discount,
    vatRate: updates.vatRate ?? current.vatRate,
  });

  const nextRecord = normalizeProjectRecord({
    ...current,
    ...updates,
    ...amounts,
    id: current.id,
    createdAt: current.createdAt,
    createdUser: current.createdUser,
    updatedAt: nowIso(),
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toProjectItem(nextRecord),
    }),
  );

  return nextRecord;
}

export async function deleteProjectRecord(projectId: string) {
  const current = await getProjectRecordById(projectId);
  if (!current) return null;

  await getDynamoDocumentClient().send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: {
        pk: buildProjectPk(projectId),
        sk: PROJECT_SK,
      },
    }),
  );

  return current;
}
