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
import {
  pfClientLineTotal,
  pfClientTaxRupiahForDisplay,
  pfListLineBase,
  pfPartnerLineTotal,
  pfPartnerTaxRupiahForDisplay,
} from "~/lib/projectFinancialsMath";
import { formatAuditUserEmail } from "~/server/utils/createdBy";
import { toLocalDate } from "~/server/utils/datetime";
import { getAwsRegion } from "~/server/utils/appFilesStorage";
import { getAppUserRecordById } from "~/server/utils/appUserStore";
import { getClientRecordById } from "~/server/utils/clientStore";
import { getPartnerRecordById } from "~/server/utils/partnerStore";
import {
  getProjectDetailListItemsByIds,
  getProjectDetailRecordById,
} from "~/server/utils/projectDetailStore";
import {
  getProjectProgressRecordByDetailId,
  getProjectProgressRecordById,
  updateProjectProgressRecord,
} from "~/server/utils/projectProgressStore";
import { getProjectRecordById } from "~/server/utils/projectStore";
import {
  matchesProjectFinancialsListFilters,
  type ProjectFinancialsFilterRecord,
  type ProjectFinancialsListFilterInput,
} from "~/server/utils/projectFinancialsListWhere";
import { listProgressStageRecords } from "~/server/utils/progressStageStore";

export type ProjectFinancialFlowDirection = "in" | "out";
export type ProjectFinancialStatus =
  | "draft"
  | "issued"
  | "approved"
  | "paid"
  | "cancelled";

export type ProjectFinancialRecord = {
  id: string;
  projectId: string;
  projectDetailId: string;
  projectProgressId: string | null;
  balapId: string | null;
  bastId: string | null;
  balapNumber: string | null;
  balapDate: string | null;
  flowDirection: ProjectFinancialFlowDirection;
  status: ProjectFinancialStatus;
  docType: string | null;
  docNumber: string | null;
  docDate: string | null;
  vbNumber: string | null;
  vbDate: string | null;
  mcmNumber: string | null;
  mcmDate: string | null;
  paidNumber: string | null;
  paidDate: string | null;
  taxIn: number | null;
  taxOut: number | null;
  pph: number | null;
  note: string | null;
  stage: number | null;
  clientId: string | null;
  partnerId: string | null;
  bastNumber: string | null;
  bastDate: string | null;
  poNumberPartner: string | null;
  poDatePartner: string | null;
  invoiceNumberPartner: string | null;
  invoiceDatePartner: string | null;
  fpNumberPartner: string | null;
  fpDatePartner: string | null;
  qtyPartner: number | null;
  unitPricePartner: number | null;
  poNumberClient: string | null;
  poDateClient: string | null;
  invoiceNumberClient: string | null;
  invoiceDateClient: string | null;
  fpNumberClient: string | null;
  fpDateClient: string | null;
  qtyClient: number | null;
  unitPriceClient: number | null;
  createdUser: string | null;
  updatedUser: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFinancialListItem = ProjectFinancialRecord & {
  projectName: string | null;
  projectPoNumber: string | null;
  contractNumber: string | null;
  poDate: string | null;
  deliveryDate: string | null;
  komDate: string | null;
  pm: string | null;
  detailMaterialName: string | null;
  detailSystemkey: string | null;
  detailSiteId: string | null;
  detailSiteName: string | null;
  detailUom: string | null;
  detailMaterialId: string | null;
  detailLineNumber: number | null;
  detailNeId: string | null;
  detailQuantity: number | null;
  detailUnitPrice: number | null;
  detailTotalPrice: number | null;
  detailStatus: string | null;
  detailPicArea: string | null;
  remarksProjectsDetails: string | null;
  remarksDelay: string | null;
  remarksCancel: string | null;
  regionName: string | null;
  subRegionName: string | null;
  cityKabName: string | null;
  clientName: string | null;
  clientNpwp: string | null;
  clientBankName: string | null;
  clientBankAccount: string | null;
  clientAddressText: string | null;
  clientAddressMeta: Record<string, unknown> | null;
  clientSignatoryName: string | null;
  clientSignatoryTitle: string | null;
  partnerName: string | null;
  partnerNpwp: string | null;
  partnerBankName: string | null;
  partnerBankAccount: string | null;
  partnerAddressText: string | null;
  partnerAddressMeta: Record<string, unknown> | null;
  partnerSignatoryName: string | null;
  partnerSignatoryTitle: string | null;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ProjectFinancialsListTotals = {
  partnerLineIdr: number;
  clientLineIdr: number;
  taxInSection: { dppIdr: number; taxIdr: number };
  taxOutSection: { dppIdr: number; taxIdr: number };
  pphSection: { dppIdr: number; taxIdr: number };
};

type ProjectFinancialListOptions = {
  includeAuditUsers?: boolean;
  includeClients?: boolean;
  includePartners?: boolean;
};

type ProjectFinancialItem = ProjectFinancialRecord & {
  pk: string;
  sk: "META";
  gsi1pk: string;
  gsi1sk: string;
  entityType: "PROJECT_FINANCIAL";
  stageName: string;
};

const PROJECT_FINANCIAL_SK = "META";
const PROJECT_FINANCIAL_ENTITY = "PROJECT_FINANCIAL";

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

function buildProjectFinancialPk(financialId: string) {
  return `PROJECT_FINANCIAL#${financialId}`;
}

function normalizeNullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeNullableDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return toLocalDate(String(value)) ?? null;
}

function normalizeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeNullableInteger(value: unknown) {
  const numberValue = normalizeNullableNumber(value);
  return numberValue == null ? null : Math.trunc(numberValue);
}

function normalizeFlowDirection(value: unknown): ProjectFinancialFlowDirection {
  return String(value ?? "in").trim().toLowerCase() === "out" ? "out" : "in";
}

function normalizeFinancialStatus(value: unknown): ProjectFinancialStatus {
  const status = String(value ?? "draft").trim().toLowerCase();
  if (
    status === "issued" ||
    status === "approved" ||
    status === "paid" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "draft";
}

function normalizeProjectFinancialRecord(
  record: Partial<ProjectFinancialRecord> & {
    id: string;
    projectId: string;
    projectDetailId: string;
  },
): ProjectFinancialRecord {
  const createdAt = String(record.createdAt ?? nowIso());
  const updatedAt = String(record.updatedAt ?? createdAt);

  return {
    id: String(record.id),
    projectId: String(record.projectId).trim(),
    projectDetailId: String(record.projectDetailId).trim(),
    projectProgressId: normalizeNullableText(record.projectProgressId),
    balapId: normalizeNullableText(record.balapId),
    bastId: normalizeNullableText(record.bastId),
    balapNumber: normalizeNullableText(record.balapNumber),
    balapDate: normalizeNullableDate(record.balapDate),
    flowDirection: normalizeFlowDirection(record.flowDirection),
    status: normalizeFinancialStatus(record.status),
    docType: normalizeNullableText(record.docType),
    docNumber: normalizeNullableText(record.docNumber),
    docDate: normalizeNullableDate(record.docDate),
    vbNumber: normalizeNullableText(record.vbNumber),
    vbDate: normalizeNullableDate(record.vbDate),
    mcmNumber: normalizeNullableText(record.mcmNumber),
    mcmDate: normalizeNullableDate(record.mcmDate),
    paidNumber: normalizeNullableText(record.paidNumber),
    paidDate: normalizeNullableDate(record.paidDate),
    taxIn: normalizeNullableNumber(record.taxIn),
    taxOut: normalizeNullableNumber(record.taxOut),
    pph: normalizeNullableNumber(record.pph),
    note: normalizeNullableText(record.note),
    stage: normalizeNullableInteger(record.stage),
    clientId: normalizeNullableText(record.clientId),
    partnerId: normalizeNullableText(record.partnerId),
    bastNumber: normalizeNullableText(record.bastNumber),
    bastDate: normalizeNullableDate(record.bastDate),
    poNumberPartner: normalizeNullableText(record.poNumberPartner),
    poDatePartner: normalizeNullableDate(record.poDatePartner),
    invoiceNumberPartner: normalizeNullableText(record.invoiceNumberPartner),
    invoiceDatePartner: normalizeNullableDate(record.invoiceDatePartner),
    fpNumberPartner: normalizeNullableText(record.fpNumberPartner),
    fpDatePartner: normalizeNullableDate(record.fpDatePartner),
    qtyPartner: normalizeNullableNumber(record.qtyPartner),
    unitPricePartner: normalizeNullableNumber(record.unitPricePartner),
    poNumberClient: normalizeNullableText(record.poNumberClient),
    poDateClient: normalizeNullableDate(record.poDateClient),
    invoiceNumberClient: normalizeNullableText(record.invoiceNumberClient),
    invoiceDateClient: normalizeNullableDate(record.invoiceDateClient),
    fpNumberClient: normalizeNullableText(record.fpNumberClient),
    fpDateClient: normalizeNullableDate(record.fpDateClient),
    qtyClient: normalizeNullableNumber(record.qtyClient),
    unitPriceClient: normalizeNullableNumber(record.unitPriceClient),
    createdUser: normalizeNullableText(record.createdUser),
    updatedUser: normalizeNullableText(record.updatedUser),
    createdAt,
    updatedAt,
  };
}

function toProjectFinancialItem(record: ProjectFinancialRecord): ProjectFinancialItem {
  const normalized = normalizeProjectFinancialRecord(record);

  return {
    pk: buildProjectFinancialPk(normalized.id),
    sk: PROJECT_FINANCIAL_SK,
    gsi1pk: `PROJECT_FINANCIAL_DETAIL#${normalized.projectDetailId}`,
    gsi1sk: `UPDATED_AT#${normalized.updatedAt}#${normalized.id}`,
    entityType: PROJECT_FINANCIAL_ENTITY,
    stageName: getStageName(),
    ...normalized,
  };
}

function mapProjectFinancialItem(item: ProjectFinancialItem): ProjectFinancialRecord {
  return normalizeProjectFinancialRecord(item);
}

function toFilterRecord(record: ProjectFinancialListItem): ProjectFinancialsFilterRecord {
  return {
    projectId: record.projectId,
    projectDetailId: record.projectDetailId,
    flowDirection: record.flowDirection,
    status: record.status,
    projectName: record.projectName,
    projectPoNumber: record.projectPoNumber,
    detailMaterialName: record.detailMaterialName,
    detailSystemkey: record.detailSystemkey,
    detailSiteId: record.detailSiteId,
    detailSiteName: record.detailSiteName,
    clientName: record.clientName,
    partnerName: record.partnerName,
    bastNumber: record.bastNumber,
    balapNumber: record.balapNumber,
    invoiceNumberPartner: record.invoiceNumberPartner,
    invoiceNumberClient: record.invoiceNumberClient,
    poNumberPartner: record.poNumberPartner,
    poNumberClient: record.poNumberClient,
    fpNumberPartner: record.fpNumberPartner,
    fpNumberClient: record.fpNumberClient,
    vbNumber: record.vbNumber,
    mcmNumber: record.mcmNumber,
    paidNumber: record.paidNumber,
    docNumber: record.docNumber,
    qtyPartner: record.qtyPartner,
    unitPricePartner: record.unitPricePartner,
    qtyClient: record.qtyClient,
    unitPriceClient: record.unitPriceClient,
    taxIn: record.taxIn,
    taxOut: record.taxOut,
    pph: record.pph,
    stage: record.stage,
    quantity: record.detailQuantity,
    unitPrice: record.detailUnitPrice,
    totalPrice: record.detailTotalPrice,
    balapDate: record.balapDate,
    bastDate: record.bastDate,
    docDate: record.docDate,
    vbDate: record.vbDate,
    mcmDate: record.mcmDate,
    paidDate: record.paidDate,
    poDatePartner: record.poDatePartner,
    poDateClient: record.poDateClient,
    invoiceDatePartner: record.invoiceDatePartner,
    invoiceDateClient: record.invoiceDateClient,
    fpDatePartner: record.fpDatePartner,
    fpDateClient: record.fpDateClient,
  };
}

async function scanAllProjectFinancialItems() {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const items: ProjectFinancialItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": PROJECT_FINANCIAL_ENTITY,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as ProjectFinancialItem[]));
    exclusiveStartKey = response.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (exclusiveStartKey);

  return items;
}

async function queryProjectFinancialItemsByDetailId(projectDetailId: string) {
  const response = await getDynamoDocumentClient().send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :gsi1pk",
      ExpressionAttributeValues: {
        ":gsi1pk": `PROJECT_FINANCIAL_DETAIL#${projectDetailId}`,
      },
      ScanIndexForward: false,
    }),
  );

  return (response.Items ?? []) as ProjectFinancialItem[];
}

async function listProjectFinancialItemsForFilters(
  filters?: ProjectFinancialsListFilterInput,
) {
  const projectDetailId = String(filters?.projectDetailId ?? "").trim();
  if (projectDetailId) {
    return queryProjectFinancialItemsByDetailId(projectDetailId);
  }

  return scanAllProjectFinancialItems();
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

function createValidationError(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;
  return error;
}

async function resolvePaidStageCode(stageData: Record<string, unknown>) {
  const currentCode = Object.keys(stageData).find((code) => /^paid$/i.test(code));
  if (currentCode) return currentCode;

  const progressStages = await listProgressStageRecords();
  const stageCode = progressStages.find((stage) => /^paid$/i.test(stage.code))?.code;
  return stageCode ?? "paid";
}

async function syncOutFlowPaidDateToProgress(input: {
  projectDetailId: string;
  projectProgressId?: string | null;
  paidDate?: string | null;
  updatedUser?: string | null;
}) {
  const progress = input.projectProgressId
    ? await getProjectProgressRecordById(input.projectProgressId)
    : await getProjectProgressRecordByDetailId(input.projectDetailId);

  if (!progress) return null;

  const paidStageCode = await resolvePaidStageCode(progress.stageData ?? {});
  const currentStage = progress.stageData?.[paidStageCode] ?? {};
  const nextPaidDate = input.paidDate ?? null;
  const nextStatus = nextPaidDate
    ? "approved"
    : currentStage.status === "approved"
      ? "pending"
      : (currentStage.status ?? "pending");

  await updateProjectProgressRecord(progress.id, {
    stageData: {
      [paidStageCode]: {
        ...currentStage,
        actual_approve_date: nextPaidDate,
        status: nextStatus,
      },
    },
    updatedUser: input.updatedUser ?? null,
  });

  return progress.id;
}

async function enrichProjectFinancialList(
  records: ProjectFinancialRecord[],
  options: ProjectFinancialListOptions = {},
): Promise<ProjectFinancialListItem[]> {
  const {
    includeAuditUsers = true,
    includeClients = true,
    includePartners = true,
  } = options;
  const clientIds = [
    ...new Set(
      includeClients
        ? (records.map((record) => record.clientId).filter(Boolean) as string[])
        : [],
    ),
  ];
  const partnerIds = [
    ...new Set(
      includePartners
        ? (records.map((record) => record.partnerId).filter(Boolean) as string[])
        : [],
    ),
  ];
  const [auditEmailMap, details, clients, partners] = await Promise.all([
    includeAuditUsers
      ? buildAuditEmailMap(
          records.flatMap((record) => [
            record.createdUser ?? "",
            record.updatedUser ?? "",
          ]),
        )
      : Promise.resolve(new Map<string, string>()),
    getProjectDetailListItemsByIds(records.map((record) => record.projectDetailId)),
    Promise.all(clientIds.map(async (id) => [id, await getClientRecordById(id)] as const)),
    Promise.all(partnerIds.map(async (id) => [id, await getPartnerRecordById(id)] as const)),
  ]);
  const clientMap = new Map(clients);
  const partnerMap = new Map(partners);

  return records.map((record, index) => {
    const detail = details[index];
    const client = record.clientId ? clientMap.get(record.clientId) ?? null : null;
    const partner = record.partnerId ? partnerMap.get(record.partnerId) ?? null : null;

    return {
      ...record,
      projectName: detail?.projectName ?? null,
      projectPoNumber: detail?.poNumber ?? null,
      contractNumber: detail?.contractNumber ?? null,
      poDate: detail?.poDate ?? null,
      deliveryDate: detail?.deliveryDate ?? null,
      komDate: detail?.komDate ?? null,
      pm: detail?.pm ?? null,
      detailMaterialName: detail?.materialName ?? null,
      detailSystemkey: detail?.systemkey ?? null,
      detailSiteId: detail?.siteId ?? null,
      detailSiteName: detail?.siteName ?? null,
      detailUom: detail?.uom ?? null,
      detailMaterialId: detail?.materialId ?? null,
      detailLineNumber: detail?.lineNumber ?? null,
      detailNeId: detail?.neId ?? null,
      detailQuantity: detail?.quantity ?? null,
      detailUnitPrice: detail?.unitPrice ?? null,
      detailTotalPrice: detail?.totalPrice ?? null,
      detailStatus: detail?.status ?? null,
      detailPicArea: detail?.picArea ?? null,
      remarksProjectsDetails: detail?.remarksProjectsDetails ?? null,
      remarksDelay: detail?.remarksDelay ?? null,
      remarksCancel: detail?.remarksCancel ?? null,
      regionName: detail?.regionName ?? null,
      subRegionName: detail?.subRegionName ?? null,
      cityKabName: detail?.cityKabName ?? null,
      clientName: client?.name ?? null,
      clientNpwp: client?.npwp ?? null,
      clientBankName: client?.bankName ?? null,
      clientBankAccount: client?.bankAccount ?? null,
      clientAddressText: client?.addressText ?? null,
      clientAddressMeta:
        client?.addressMeta && typeof client.addressMeta === "object"
          ? client.addressMeta
          : null,
      clientSignatoryName: client?.signatoryName ?? null,
      clientSignatoryTitle: client?.signatoryTitle ?? null,
      partnerName: partner?.name ?? null,
      partnerNpwp: partner?.npwp ?? null,
      partnerBankName: partner?.bankName ?? null,
      partnerBankAccount: partner?.bankAccount ?? null,
      partnerAddressText: partner?.addressText ?? null,
      partnerAddressMeta:
        partner?.addressMeta && typeof partner.addressMeta === "object"
          ? partner.addressMeta
          : null,
      partnerSignatoryName: partner?.signatoryName ?? null,
      partnerSignatoryTitle: partner?.signatoryTitle ?? null,
      createdBy: record.createdUser ? auditEmailMap.get(record.createdUser) ?? null : null,
      updatedBy: record.updatedUser ? auditEmailMap.get(record.updatedUser) ?? null : null,
    };
  });
}

async function validateProjectFinancialReferences(input: {
  projectId: string;
  projectDetailId: string;
  projectProgressId?: string | null;
  clientId?: string | null;
  partnerId?: string | null;
  flowDirection: ProjectFinancialFlowDirection;
}) {
  const [project, detail, progress, client, partner] = await Promise.all([
    getProjectRecordById(input.projectId),
    getProjectDetailRecordById(input.projectDetailId),
    input.projectProgressId
      ? getProjectProgressRecordById(input.projectProgressId)
      : Promise.resolve(null),
    input.clientId ? getClientRecordById(input.clientId) : Promise.resolve(null),
    input.partnerId ? getPartnerRecordById(input.partnerId) : Promise.resolve(null),
  ]);

  if (!project) {
    throw createValidationError(`Invalid project reference: ${input.projectId}`);
  }

  if (!detail) {
    throw createValidationError(`Invalid project detail reference: ${input.projectDetailId}`);
  }

  if (detail.projectId !== project.id) {
    throw createValidationError("Project detail does not belong to the selected project");
  }

  if (input.projectProgressId && !progress) {
    throw createValidationError(`Invalid project progress reference: ${input.projectProgressId}`);
  }

  if (progress && progress.projectDetailId !== detail.id) {
    throw createValidationError("Project progress does not belong to the selected detail");
  }

  if (input.flowDirection === "out" && !input.clientId) {
    throw createValidationError("clientId is required for flowDirection=out");
  }

  if (input.flowDirection === "in" && !input.partnerId) {
    throw createValidationError("partnerId is required for flowDirection=in");
  }

  if (input.clientId && !client) {
    throw createValidationError(`Invalid client reference: ${input.clientId}`);
  }

  if (input.partnerId && !partner) {
    throw createValidationError(`Invalid partner reference: ${input.partnerId}`);
  }
}

async function resolveProjectProgressIdForFinancial(input: {
  projectDetailId: string;
  projectProgressId?: string | null;
  flowDirection: ProjectFinancialFlowDirection;
}) {
  if (input.projectProgressId) return input.projectProgressId;
  if (input.flowDirection !== "out") return null;

  const progress = await getProjectProgressRecordByDetailId(input.projectDetailId);
  return progress?.id ?? null;
}

function computeSectionTotals(items: ProjectFinancialListItem[]) {
  const totals: ProjectFinancialsListTotals = {
    partnerLineIdr: 0,
    clientLineIdr: 0,
    taxInSection: { dppIdr: 0, taxIdr: 0 },
    taxOutSection: { dppIdr: 0, taxIdr: 0 },
    pphSection: { dppIdr: 0, taxIdr: 0 },
  };

  for (const item of items) {
    if (item.flowDirection === "in") {
      totals.partnerLineIdr += pfPartnerLineTotal(
        item.qtyPartner,
        item.unitPricePartner,
        item.pph,
        item.taxIn,
      ) ?? 0;
    }

    if (item.flowDirection === "out") {
      totals.clientLineIdr += pfClientLineTotal(
        item.qtyClient,
        item.unitPriceClient,
        item.taxOut,
      ) ?? 0;
    }

    if (item.flowDirection === "in" && Number(item.taxIn ?? 0) > 0) {
      totals.taxInSection.dppIdr +=
        pfListLineBase(item.qtyPartner, item.unitPricePartner) ?? 0;
      totals.taxInSection.taxIdr +=
        pfPartnerTaxRupiahForDisplay(
          item.qtyPartner,
          item.unitPricePartner,
          item.taxIn,
        ) ?? 0;
    }

    if (item.flowDirection === "out" && Number(item.taxOut ?? 0) > 0) {
      totals.taxOutSection.dppIdr +=
        pfListLineBase(item.qtyClient, item.unitPriceClient) ?? 0;
      totals.taxOutSection.taxIdr +=
        pfClientTaxRupiahForDisplay(
          item.qtyClient,
          item.unitPriceClient,
          item.taxOut,
        ) ?? 0;
    }

    if (item.flowDirection === "in" && Number(item.pph ?? 0) > 0) {
      totals.pphSection.dppIdr +=
        pfListLineBase(item.qtyPartner, item.unitPricePartner) ?? 0;
      totals.pphSection.taxIdr +=
        pfPartnerTaxRupiahForDisplay(
          item.qtyPartner,
          item.unitPricePartner,
          item.pph,
        ) ?? 0;
    }
  }

  return totals;
}

export async function getProjectFinancialRecordById(financialId: string) {
  const client = getDynamoDocumentClient();
  const tableName = getTableName();
  const response = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: buildProjectFinancialPk(financialId),
        sk: PROJECT_FINANCIAL_SK,
      },
    }),
  );

  const item = response.Item as ProjectFinancialItem | undefined;
  return item ? mapProjectFinancialItem(item) : null;
}

export async function getProjectFinancialListItemById(financialId: string) {
  const record = await getProjectFinancialRecordById(financialId);
  if (!record) return null;

  const items = await enrichProjectFinancialList([record]);
  return items[0] ?? null;
}

export async function listProjectFinancialRecords(
  filters?: ProjectFinancialsListFilterInput,
  options?: ProjectFinancialListOptions,
) {
  const rawFilters = filters
    ? {
        projectId: filters.projectId,
        projectDetailId: filters.projectDetailId,
        poNumberPartner: filters.poNumberPartner,
        invoiceNumberPartner: filters.invoiceNumberPartner,
        status: filters.status,
        flowDirection: filters.flowDirection,
        taxSection: filters.taxSection,
      }
    : {};
  const records = (await listProjectFinancialItemsForFilters(filters))
    .map(mapProjectFinancialItem)
    .filter((record) =>
      matchesProjectFinancialsListFilters(record, rawFilters),
    );
  const enriched = await enrichProjectFinancialList(records, options);

  return enriched
    .filter((record) =>
      matchesProjectFinancialsListFilters(toFilterRecord(record), filters ?? {}),
    )
    .sort((a, b) => {
      const createdCompare = b.createdAt.localeCompare(a.createdAt);
      if (createdCompare !== 0) return createdCompare;
      return b.id.localeCompare(a.id);
    });
}

export async function getLatestFinancialByDetailId(input: {
  projectDetailId: string;
  flowDirection?: ProjectFinancialFlowDirection;
}) {
  const records = (await queryProjectFinancialItemsByDetailId(input.projectDetailId))
    .map(mapProjectFinancialItem)
    .filter((record) => {
      if (record.projectDetailId !== input.projectDetailId) return false;
      if (input.flowDirection && record.flowDirection !== input.flowDirection) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const updatedCompare = b.updatedAt.localeCompare(a.updatedAt);
      if (updatedCompare !== 0) return updatedCompare;
      return b.id.localeCompare(a.id);
    });

  return records[0] ?? null;
}

export function computeProjectFinancialsListTotals(items: ProjectFinancialListItem[]) {
  return computeSectionTotals(items);
}

export async function createProjectFinancialRecord(
  params: Omit<ProjectFinancialRecord, "id" | "createdAt" | "updatedAt" | "projectProgressId"> & {
    projectProgressId?: string | null;
  },
) {
  const flowDirection = normalizeFlowDirection(params.flowDirection);
  const resolvedProjectProgressId = await resolveProjectProgressIdForFinancial({
    projectDetailId: params.projectDetailId,
    projectProgressId: params.projectProgressId,
    flowDirection,
  });

  await validateProjectFinancialReferences({
    projectId: params.projectId,
    projectDetailId: params.projectDetailId,
    projectProgressId: resolvedProjectProgressId,
    clientId: params.clientId,
    partnerId: params.partnerId,
    flowDirection,
  });

  const createdAt = nowIso();
  const record = normalizeProjectFinancialRecord({
    id: randomUUID(),
    ...params,
    flowDirection,
    projectProgressId: resolvedProjectProgressId,
    createdAt,
    updatedAt: createdAt,
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toProjectFinancialItem(record),
    }),
  );

  if (record.flowDirection === "out") {
    await syncOutFlowPaidDateToProgress({
      projectDetailId: record.projectDetailId,
      projectProgressId: record.projectProgressId,
      paidDate: record.paidDate,
      updatedUser: record.updatedUser ?? record.createdUser,
    });
  }

  return record;
}

export async function updateProjectFinancialRecord(
  financialId: string,
  updates: Partial<Omit<ProjectFinancialRecord, "id" | "createdAt" | "createdUser" | "projectProgressId">> & {
    projectProgressId?: string | null;
  },
) {
  const current = await getProjectFinancialRecordById(financialId);
  if (!current) return null;

  const nextProjectId = String(updates.projectId ?? current.projectId).trim();
  const nextProjectDetailId = String(
    updates.projectDetailId ?? current.projectDetailId,
  ).trim();
  const nextFlowDirection = normalizeFlowDirection(
    updates.flowDirection ?? current.flowDirection,
  );
  const requestedProjectProgressId =
    updates.projectProgressId === undefined
      ? current.projectProgressId
      : updates.projectProgressId;
  const resolvedProjectProgressId = await resolveProjectProgressIdForFinancial({
    projectDetailId: nextProjectDetailId,
    projectProgressId: requestedProjectProgressId,
    flowDirection: nextFlowDirection,
  });

  await validateProjectFinancialReferences({
    projectId: nextProjectId,
    projectDetailId: nextProjectDetailId,
    projectProgressId: resolvedProjectProgressId,
    clientId:
      updates.clientId === undefined ? current.clientId : updates.clientId,
    partnerId:
      updates.partnerId === undefined ? current.partnerId : updates.partnerId,
    flowDirection: nextFlowDirection,
  });

  const nextRecord = normalizeProjectFinancialRecord({
    ...current,
    ...updates,
    id: current.id,
    projectId: nextProjectId,
    projectDetailId: nextProjectDetailId,
    flowDirection: nextFlowDirection,
    projectProgressId: resolvedProjectProgressId,
    createdAt: current.createdAt,
    createdUser: current.createdUser,
    updatedAt: nowIso(),
  });

  await getDynamoDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: toProjectFinancialItem(nextRecord),
    }),
  );

  if (current.flowDirection === "out" && current.projectDetailId !== nextRecord.projectDetailId) {
    const latestPrevious = await getLatestFinancialByDetailId({
      projectDetailId: current.projectDetailId,
      flowDirection: "out",
    });
    await syncOutFlowPaidDateToProgress({
      projectDetailId: current.projectDetailId,
      projectProgressId: current.projectProgressId,
      paidDate: latestPrevious?.paidDate ?? null,
      updatedUser: nextRecord.updatedUser,
    });
  }

  if (nextRecord.flowDirection === "out") {
    await syncOutFlowPaidDateToProgress({
      projectDetailId: nextRecord.projectDetailId,
      projectProgressId: nextRecord.projectProgressId,
      paidDate: nextRecord.paidDate,
      updatedUser: nextRecord.updatedUser,
    });
  }

  return nextRecord;
}

export async function deleteProjectFinancialRecord(financialId: string) {
  const current = await getProjectFinancialRecordById(financialId);
  if (!current) return null;

  await getDynamoDocumentClient().send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: {
        pk: buildProjectFinancialPk(financialId),
        sk: PROJECT_FINANCIAL_SK,
      },
    }),
  );

  if (current.flowDirection === "out") {
    const latestRemaining = await getLatestFinancialByDetailId({
      projectDetailId: current.projectDetailId,
      flowDirection: "out",
    });
    await syncOutFlowPaidDateToProgress({
      projectDetailId: current.projectDetailId,
      projectProgressId: current.projectProgressId ?? latestRemaining?.projectProgressId,
      paidDate: latestRemaining?.paidDate ?? null,
      updatedUser: current.updatedUser ?? current.createdUser,
    });
  }

  return current;
}
