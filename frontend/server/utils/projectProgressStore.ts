import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { formatAuditUserEmail } from "~/server/utils/createdBy";
import { toLocalDate } from "~/server/utils/datetime";
import { getAwsRegion } from "~/server/utils/appFilesStorage";
import { getAppUserRecordById } from "~/server/utils/appUserStore";
import {
  getProjectDetailRecordById,
  getProjectDetailListItemsByIds,
  updateProjectDetailRecord,
} from "~/server/utils/projectDetailStore";
import { getProjectRecordById } from "~/server/utils/projectStore";
import {
  matchesProjectProgressListFilters,
  type ProjectProgressFilterRecord,
  type ProjectProgressListFilterInput,
} from "~/server/utils/projectProgressListWhere";

export type ProgressStageStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "delayed"
  | "cancelled";

export type ProjectProgressStage = {
  plan_submit_date?: string | null;
  actual_approve_date?: string | null;
  remarks?: string | null;
  status?: ProgressStageStatus | null;
};

export type ProjectProgressStageData = Record<string, ProjectProgressStage>;

export type ProjectProgressRecord = {
  id: string;
  projectId: string;
  projectDetailId: string;
  stageData: ProjectProgressStageData;
  createdUser: string | null;
  updatedUser: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectProgressListItem = ProjectProgressRecord & {
  projectName: string | null;
  contractNumber: string | null;
  poNumber: string | null;
  poDate: string | null;
  deliveryDate: string | null;
  komDate: string | null;
  projectDetailSiteName: string | null;
  siteName: string | null;
  siteId: string | null;
  materialId: string | null;
  materialName: string | null;
  lineNumber: number | null;
  systemKey: string | null;
  neId: string | null;
  picArea: string | null;
  cityKabName: string | null;
  subRegionName: string | null;
  regionName: string | null;
  remarksProjectsDetails: string | null;
  remarksDelay: string | null;
  remarksCancel: string | null;
  detailStatus: string | null;
  createdBy: string | null;
  updatedBy: string | null;
};

type ProjectProgressItem = ProjectProgressRecord & {
  pk: string;
  sk: "META";
  gsi1pk: string;
  gsi1sk: string;
  entityType: "PROJECT_PROGRESS";
  stage: string;
};

type ProjectProgressDetailLockItem = {
  pk: string;
  sk: "LOCK";
  entityType: "PROJECT_PROGRESS_DETAIL_LOCK";
  progressId: string;
  projectId: string;
  projectDetailId: string;
  createdAt: string;
  updatedAt: string;
  stage: string;
};

const PROJECT_PROGRESS_SK = "META";
const PROJECT_PROGRESS_ENTITY = "PROJECT_PROGRESS";
const PROJECT_PROGRESS_DETAIL_LOCK_SK = "LOCK";
const PROJECT_PROGRESS_DETAIL_LOCK_ENTITY = "PROJECT_PROGRESS_DETAIL_LOCK";
const PROJECT_PROGRESS_DETAIL_EXISTS_MESSAGE =
  "Project progress already exists for this detail";

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

function buildProjectProgressPk(progressId: string) {
  return `PROJECT_PROGRESS#${progressId}`;
}

function buildProjectProgressDetailLockPk(projectDetailId: string) {
  return `PROJECT_PROGRESS_DETAIL_LOCK#${projectDetailId}`;
}

function normalizeNullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeStageStatus(value: unknown): ProgressStageStatus | null {
  const status = String(value ?? "").trim().toLowerCase();
  if (
    status === "pending" ||
    status === "submitted" ||
    status === "approved" ||
    status === "delayed" ||
    status === "cancelled"
  ) {
    return status;
  }

  return null;
}

function normalizeStageDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return toLocalDate(String(value)) ?? null;
}

function normalizeStageData(stageData: unknown): ProjectProgressStageData {
  const source =
    stageData && typeof stageData === "object"
      ? (stageData as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    Object.entries(source).map(([code, stage]) => {
      const rawStage =
        stage && typeof stage === "object"
          ? (stage as Record<string, unknown>)
          : {};

      return [
        code,
        {
          plan_submit_date: normalizeStageDate(rawStage.plan_submit_date),
          actual_approve_date: normalizeStageDate(rawStage.actual_approve_date),
          remarks: normalizeNullableText(rawStage.remarks),
          status: normalizeStageStatus(rawStage.status),
        },
      ];
    }),
  );
}

function normalizeProjectProgressRecord(
  record: Partial<ProjectProgressRecord> & {
    id: string;
    projectId: string;
    projectDetailId: string;
  },
): ProjectProgressRecord {
  const createdAt = String(record.createdAt ?? nowIso());
  const updatedAt = String(record.updatedAt ?? createdAt);

  return {
    id: String(record.id),
    projectId: String(record.projectId).trim(),
    projectDetailId: String(record.projectDetailId).trim(),
    stageData: normalizeStageData(record.stageData),
    createdUser: normalizeNullableText(record.createdUser),
    updatedUser: normalizeNullableText(record.updatedUser),
    createdAt,
    updatedAt,
  };
}

function toProjectProgressItem(record: ProjectProgressRecord): ProjectProgressItem {
  const normalized = normalizeProjectProgressRecord(record);

  return {
    pk: buildProjectProgressPk(normalized.id),
    sk: PROJECT_PROGRESS_SK,
    gsi1pk: `PROJECT_PROGRESS_DETAIL#${normalized.projectDetailId}`,
    gsi1sk: `UPDATED_AT#${normalized.updatedAt}#${normalized.id}`,
    entityType: PROJECT_PROGRESS_ENTITY,
    stage: getStageName(),
    ...normalized,
  };
}

function toProjectProgressDetailLockItem(input: {
  progressId: string;
  projectId: string;
  projectDetailId: string;
  createdAt: string;
  updatedAt: string;
}): ProjectProgressDetailLockItem {
  return {
    pk: buildProjectProgressDetailLockPk(input.projectDetailId),
    sk: PROJECT_PROGRESS_DETAIL_LOCK_SK,
    entityType: PROJECT_PROGRESS_DETAIL_LOCK_ENTITY,
    progressId: input.progressId,
    projectId: input.projectId,
    projectDetailId: input.projectDetailId,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    stage: getStageName(),
  };
}

function mapProjectProgressItem(item: ProjectProgressItem): ProjectProgressRecord {
  return normalizeProjectProgressRecord(item);
}

async function scanAllProjectProgressItems() {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const items: ProjectProgressItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": PROJECT_PROGRESS_ENTITY,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as ProjectProgressItem[]));
    exclusiveStartKey = response.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (exclusiveStartKey);

  return items;
}

async function queryProjectProgressItemsByDetailId(projectDetailId: string) {
  const response = await getDynamoDocumentClient().send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :gsi1pk",
      ExpressionAttributeValues: {
        ":gsi1pk": `PROJECT_PROGRESS_DETAIL#${projectDetailId}`,
      },
      ScanIndexForward: false,
    }),
  );

  return (response.Items ?? []) as ProjectProgressItem[];
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

async function enrichProjectProgressList(
  records: ProjectProgressRecord[],
): Promise<ProjectProgressListItem[]> {
  const auditEmailMap = await buildAuditEmailMap(
    records.flatMap((record) => [record.createdUser ?? "", record.updatedUser ?? ""]),
  );

  const details = await getProjectDetailListItemsByIds(
    records.map((record) => record.projectDetailId),
  );

  return records.map((record, index) => {
    const detail = details[index];

    return {
      ...record,
      projectName: detail?.projectName ?? null,
      contractNumber: detail?.contractNumber ?? null,
      poNumber: detail?.poNumber ?? null,
      poDate: detail?.poDate ?? null,
      deliveryDate: detail?.deliveryDate ?? null,
      komDate: detail?.komDate ?? null,
      projectDetailSiteName: detail?.siteName ?? null,
      siteName: detail?.siteName ?? null,
      siteId: detail?.siteId ?? null,
      materialId: detail?.materialId ?? null,
      materialName: detail?.materialName ?? null,
      lineNumber: detail?.lineNumber ?? null,
      systemKey: detail?.systemkey ?? null,
      neId: detail?.neId ?? null,
      picArea: detail?.picArea ?? null,
      cityKabName: detail?.cityKabName ?? null,
      subRegionName: detail?.subRegionName ?? null,
      regionName: detail?.regionName ?? null,
      remarksProjectsDetails: detail?.remarksProjectsDetails ?? null,
      remarksDelay: detail?.remarksDelay ?? null,
      remarksCancel: detail?.remarksCancel ?? null,
      detailStatus: detail?.status ?? null,
      createdBy: record.createdUser ? auditEmailMap.get(record.createdUser) ?? null : null,
      updatedBy: record.updatedUser ? auditEmailMap.get(record.updatedUser) ?? null : null,
    };
  });
}

function createValidationError(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;
  return error;
}

function throwProjectProgressDetailConflict() {
  throw createValidationError(PROJECT_PROGRESS_DETAIL_EXISTS_MESSAGE);
}

function rethrowTransactionConflict(error: unknown) {
  if ((error as { name?: string } | null)?.name === "TransactionCanceledException") {
    throwProjectProgressDetailConflict();
  }

  throw error;
}

async function ensureProjectProgressRelations(input: {
  projectId: string;
  projectDetailId: string;
}) {
  const [project, detail] = await Promise.all([
    getProjectRecordById(input.projectId),
    getProjectDetailRecordById(input.projectDetailId),
  ]);

  if (!project) {
    throw createValidationError(`Invalid project reference: ${input.projectId}`);
  }

  if (!detail) {
    throw createValidationError(
      `Invalid project detail reference: ${input.projectDetailId}`,
    );
  }

  if (detail.projectId !== project.id) {
    throw createValidationError(
      "Project detail does not belong to the selected project",
    );
  }

  return { project, detail };
}

function ensureStagesMatchProject(
  project: { progressStageCodes: string[] },
  stageData: ProjectProgressStageData | null | undefined,
) {
  const configuredCodes = project.progressStageCodes ?? [];
  // Projects created before this setting existed retain access to all stages.
  if (!configuredCodes.length || !stageData) return;
  const invalidCodes = Object.keys(stageData).filter(
    (code) => !configuredCodes.includes(code),
  );
  if (invalidCodes.length) {
    throw createValidationError(
      `Stage is not enabled for this project: ${invalidCodes.join(", ")}`,
    );
  }
}

async function ensureUniqueProgressByDetail(
  projectDetailId: string,
  excludeId?: string,
) {
  const existing = (await queryProjectProgressItemsByDetailId(projectDetailId)).map(
    mapProjectProgressItem,
  );
  const hit = existing.find(
    (record) =>
      record.projectDetailId === projectDetailId && record.id !== excludeId,
  );

  if (hit) {
    throwProjectProgressDetailConflict();
  }
}

function mergeStageData(
  current: ProjectProgressStageData,
  incoming?: ProjectProgressStageData | null,
) {
  if (!incoming) return current;

  const normalizedCurrent = normalizeStageData(current);
  const normalizedIncoming = normalizeStageData(incoming);

  return Object.fromEntries([
    ...Object.entries(normalizedCurrent),
    ...Object.entries(normalizedIncoming).map(([code, stage]) => [
      code,
      {
        ...(normalizedCurrent[code] ?? {}),
        ...stage,
      },
    ]),
  ]);
}

function validateApprovedAndDelayedRules(input: {
  stageData: ProjectProgressStageData;
  remarksDelay?: string | null;
}) {
  const nextRemarksDelay = String(input.remarksDelay ?? "").trim();

  for (const [stageCode, stage] of Object.entries(input.stageData)) {
    if (stage.status === "approved" && !stage.actual_approve_date) {
      throw createValidationError(
        `Approve date required for stage ${stageCode}`,
      );
    }

    if (stage.status === "delayed" && !nextRemarksDelay) {
      throw createValidationError(
        "Remarks delay (on project detail) is required when any stage is delayed",
      );
    }
  }
}

export function computeStageCounts(records: ProjectProgressRecord[]) {
  const stageCounts: Record<string, { plan: number; actual: number }> = {};

  for (const record of records) {
    for (const [code, stage] of Object.entries(record.stageData ?? {})) {
      if (!stageCounts[code]) {
        stageCounts[code] = { plan: 0, actual: 0 };
      }

      if (String(stage.plan_submit_date ?? "").trim()) {
        stageCounts[code].plan += 1;
      }

      if (String(stage.actual_approve_date ?? "").trim()) {
        stageCounts[code].actual += 1;
      }
    }
  }

  return stageCounts;
}

export async function getProjectProgressRecordById(progressId: string) {
  const client = getDynamoDocumentClient();
  const tableName = getTableName();
  const response = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: buildProjectProgressPk(progressId),
        sk: PROJECT_PROGRESS_SK,
      },
    }),
  );

  const item = response.Item as ProjectProgressItem | undefined;
  return item ? mapProjectProgressItem(item) : null;
}

export async function getProjectProgressRecordByDetailId(projectDetailId: string) {
  const record = (await queryProjectProgressItemsByDetailId(projectDetailId))
    .map(mapProjectProgressItem)
    .find((item) => item.projectDetailId === projectDetailId);

  return record ?? null;
}

export async function getProjectProgressListItemById(progressId: string) {
  const record = await getProjectProgressRecordById(progressId);
  if (!record) return null;

  const items = await enrichProjectProgressList([record]);
  return items[0] ?? null;
}

export async function listProjectProgressRecords(
  filters?: ProjectProgressListFilterInput,
) {
  const records = (await scanAllProjectProgressItems()).map(mapProjectProgressItem);
  const enriched = await enrichProjectProgressList(records);

  return enriched
    .filter((record) =>
      matchesProjectProgressListFilters(record, filters ?? {}),
    )
    .sort((a, b) => {
      const createdCompare = b.createdAt.localeCompare(a.createdAt);
      if (createdCompare !== 0) return createdCompare;
      return b.id.localeCompare(a.id);
    });
}

export async function listProjectProgressUsageByDetailIds(
  projectDetailIds: string[],
) {
  const detailSet = new Set(projectDetailIds);
  if (detailSet.size === 0) return [];

  return (await scanAllProjectProgressItems())
    .map(mapProjectProgressItem)
    .filter((progress) => detailSet.has(progress.projectDetailId))
    .map((progress) => ({
      id: progress.id,
      projectId: progress.projectId,
      projectDetailId: progress.projectDetailId,
    }));
}

export async function listProjectProgressUsage(filters?: {
  projectId?: string;
  excludeProgressId?: string;
}) {
  const projectId = String(filters?.projectId ?? "").trim();
  const excludeProgressId = String(filters?.excludeProgressId ?? "").trim();

  return (await scanAllProjectProgressItems())
    .map(mapProjectProgressItem)
    .filter((progress) => {
      if (projectId && progress.projectId !== projectId) return false;
      if (excludeProgressId && progress.id === excludeProgressId) return false;
      return true;
    })
    .map((progress) => ({
      id: progress.id,
      projectId: progress.projectId,
      projectDetailId: progress.projectDetailId,
    }));
}

export async function createProjectProgressRecord(params: {
  projectId: string;
  projectDetailId: string;
  stageData?: ProjectProgressStageData | null;
  remarksProjectsDetails?: string | null;
  remarksDelay?: string | null;
  remarksCancel?: string | null;
  createdUser?: string | null;
  updatedUser?: string | null;
}) {
  const { project, detail } = await ensureProjectProgressRelations({
    projectId: params.projectId,
    projectDetailId: params.projectDetailId,
  });
  await ensureUniqueProgressByDetail(detail.id);

  const stageData = normalizeStageData(params.stageData);
  ensureStagesMatchProject(project, stageData);
  validateApprovedAndDelayedRules({
    stageData,
    remarksDelay: params.remarksDelay ?? detail.remarksDelay,
  });

  const hasRemarkPatch =
    params.remarksProjectsDetails !== undefined ||
    params.remarksDelay !== undefined ||
    params.remarksCancel !== undefined;

  if (hasRemarkPatch) {
    await updateProjectDetailRecord(detail.id, {
      remarksProjectsDetails:
        params.remarksProjectsDetails !== undefined
          ? params.remarksProjectsDetails
          : detail.remarksProjectsDetails,
      remarksDelay:
        params.remarksDelay !== undefined
          ? params.remarksDelay
          : detail.remarksDelay,
      remarksCancel:
        params.remarksCancel !== undefined
          ? params.remarksCancel
          : detail.remarksCancel,
      updatedUser: params.updatedUser ?? params.createdUser ?? null,
    });
  }

  const createdAt = nowIso();
  const record = normalizeProjectProgressRecord({
    id: randomUUID(),
    projectId: params.projectId,
    projectDetailId: params.projectDetailId,
    stageData,
    createdUser: params.createdUser ?? null,
    updatedUser: params.updatedUser ?? params.createdUser ?? null,
    createdAt,
    updatedAt: createdAt,
  });

  try {
    await getDynamoDocumentClient().send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: getTableName(),
              Item: toProjectProgressDetailLockItem({
                progressId: record.id,
                projectId: record.projectId,
                projectDetailId: record.projectDetailId,
                createdAt,
                updatedAt: createdAt,
              }),
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            Put: {
              TableName: getTableName(),
              Item: toProjectProgressItem(record),
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
        ],
      }),
    );
  } catch (error) {
    rethrowTransactionConflict(error);
  }

  return record;
}

export async function updateProjectProgressRecord(
  progressId: string,
  updates: Partial<{
    projectId: string;
    projectDetailId: string;
    stageData: ProjectProgressStageData | null;
    remarksProjectsDetails: string | null;
    remarksDelay: string | null;
    remarksCancel: string | null;
    updatedUser: string | null;
  }>,
) {
  const current = await getProjectProgressRecordById(progressId);
  if (!current) return null;

  const nextProjectId = String(updates.projectId ?? current.projectId).trim();
  const nextProjectDetailId = String(
    updates.projectDetailId ?? current.projectDetailId,
  ).trim();
  const { project, detail } = await ensureProjectProgressRelations({
    projectId: nextProjectId,
    projectDetailId: nextProjectDetailId,
  });
  await ensureUniqueProgressByDetail(detail.id, current.id);

  ensureStagesMatchProject(project, updates.stageData);
  const nextStageData = mergeStageData(current.stageData, updates.stageData);
  validateApprovedAndDelayedRules({
    stageData: nextStageData,
    remarksDelay:
      updates.remarksDelay !== undefined
        ? updates.remarksDelay
        : detail.remarksDelay,
  });

  const hasRemarkPatch =
    updates.remarksProjectsDetails !== undefined ||
    updates.remarksDelay !== undefined ||
    updates.remarksCancel !== undefined;

  if (hasRemarkPatch) {
    await updateProjectDetailRecord(detail.id, {
      remarksProjectsDetails:
        updates.remarksProjectsDetails !== undefined
          ? updates.remarksProjectsDetails
          : detail.remarksProjectsDetails,
      remarksDelay:
        updates.remarksDelay !== undefined
          ? updates.remarksDelay
          : detail.remarksDelay,
      remarksCancel:
        updates.remarksCancel !== undefined
          ? updates.remarksCancel
          : detail.remarksCancel,
      updatedUser: updates.updatedUser ?? null,
    });
  }

  const nextRecord = normalizeProjectProgressRecord({
    ...current,
    id: current.id,
    projectId: nextProjectId,
    projectDetailId: nextProjectDetailId,
    stageData: nextStageData,
    createdAt: current.createdAt,
    createdUser: current.createdUser,
    updatedUser: updates.updatedUser ?? current.updatedUser,
    updatedAt: nowIso(),
  });

  try {
    await getDynamoDocumentClient().send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: getTableName(),
              Item: toProjectProgressDetailLockItem({
                progressId: nextRecord.id,
                projectId: nextRecord.projectId,
                projectDetailId: nextRecord.projectDetailId,
                createdAt: current.createdAt,
                updatedAt: nextRecord.updatedAt,
              }),
              ConditionExpression:
                "attribute_not_exists(pk) OR progressId = :progressId",
              ExpressionAttributeValues: {
                ":progressId": nextRecord.id,
              },
            },
          },
          {
            Put: {
              TableName: getTableName(),
              Item: toProjectProgressItem(nextRecord),
              ConditionExpression: "attribute_exists(pk)",
            },
          },
          ...(current.projectDetailId === nextProjectDetailId
            ? []
            : [
                {
                  Delete: {
                    TableName: getTableName(),
                    Key: {
                      pk: buildProjectProgressDetailLockPk(current.projectDetailId),
                      sk: PROJECT_PROGRESS_DETAIL_LOCK_SK,
                    },
                    ConditionExpression:
                      "attribute_not_exists(pk) OR progressId = :progressId",
                    ExpressionAttributeValues: {
                      ":progressId": current.id,
                    },
                  },
                },
              ]),
        ],
      }),
    );
  } catch (error) {
    rethrowTransactionConflict(error);
  }

  return nextRecord;
}

export async function deleteProjectProgressRecord(progressId: string) {
  const current = await getProjectProgressRecordById(progressId);
  if (!current) return null;

  await getDynamoDocumentClient().send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: getTableName(),
            Key: {
              pk: buildProjectProgressPk(progressId),
              sk: PROJECT_PROGRESS_SK,
            },
          },
        },
        {
          Delete: {
            TableName: getTableName(),
            Key: {
              pk: buildProjectProgressDetailLockPk(current.projectDetailId),
              sk: PROJECT_PROGRESS_DETAIL_LOCK_SK,
            },
            ConditionExpression:
              "attribute_not_exists(pk) OR progressId = :progressId",
            ExpressionAttributeValues: {
              ":progressId": current.id,
            },
          },
        },
      ],
    }),
  );

  return current;
}
