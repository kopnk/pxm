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
  type RlsMatrix,
  defaultMatrixForRole,
  normalizeRlsMatrix,
} from "~/lib/rls";
import { formatAuditUserEmail } from "~/server/utils/createdBy";
import { getAwsRegion } from "~/server/utils/appFilesStorage";

export type AppUserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  phone?: string | null;
  region?: string | null;
  area?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdUser?: string | null;
  updatedUser?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type AppUserRecord = {
  user: AppUserProfile;
  permissions: RlsMatrix;
  source: "dynamodb";
};

type UserProfileItem = AppUserProfile & {
  pk: string;
  sk: "PROFILE";
  gsi1pk: string;
  gsi1sk: "PROFILE";
  gsi2pk: string;
  gsi2sk: string;
  entityType: "USER_PROFILE";
  stage: string;
};

type UserPermissionsItem = {
  pk: string;
  sk: "PERMISSIONS";
  gsi1pk: string;
  gsi1sk: string;
  gsi2pk: string;
  gsi2sk: string;
  entityType: "USER_PERMISSIONS";
  stage: string;
  userId: string;
  role: string;
  permissions: RlsMatrix;
  createdAt: string;
  updatedAt: string;
};

const USER_PROFILE_SK = "PROFILE";
const USER_PERMISSIONS_SK = "PERMISSIONS";
const USER_PROFILE_ENTITY = "USER_PROFILE";
const USER_PERMISSIONS_ENTITY = "USER_PERMISSIONS";

let dynamoClient: DynamoDBDocumentClient | null = null;

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

function buildUserPk(userId: string) {
  return `USER#${userId}`;
}

function buildUserEmailGsiPk(email: string) {
  return `USER_EMAIL#${normalizeEmail(email)}`;
}

function normalizeAppUser(user: AppUserProfile): AppUserProfile {
  return {
    id: String(user.id),
    email: normalizeEmail(user.email),
    firstName: String(user.firstName ?? ""),
    lastName: String(user.lastName ?? ""),
    role: String(user.role ?? "staff"),
    isActive: Boolean(user.isActive),
    mustChangePassword: Boolean(user.mustChangePassword),
    phone: user.phone ?? null,
    region: user.region ?? null,
    area: user.area ?? null,
    avatarUrl: user.avatarUrl ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
    createdUser: user.createdUser ?? null,
    updatedUser: user.updatedUser ?? null,
    createdBy: formatAuditUserEmail(user.createdBy),
    updatedBy: formatAuditUserEmail(user.updatedBy),
  };
}

function mapUserProfileItem(item: UserProfileItem): AppUserProfile {
  return normalizeAppUser(item);
}

function toUserProfileItem(user: AppUserProfile): UserProfileItem {
  const normalized = normalizeAppUser(user);
  const stage = getStageName();
  const createdAt = normalized.createdAt ?? nowIso();
  const updatedAt = normalized.updatedAt ?? createdAt;

  return {
    pk: buildUserPk(normalized.id),
    sk: USER_PROFILE_SK,
    gsi1pk: buildUserEmailGsiPk(normalized.email),
    gsi1sk: USER_PROFILE_SK,
    gsi2pk: `ROLE#${String(normalized.role ?? "staff").toLowerCase()}`,
    gsi2sk: `USER#${normalized.id}`,
    entityType: USER_PROFILE_ENTITY,
    stage,
    ...normalized,
    createdAt,
    updatedAt,
  };
}

function toUserPermissionsItem(record: AppUserRecord): UserPermissionsItem {
  const stage = getStageName();
  const normalizedUser = normalizeAppUser(record.user);
  const timestamp =
    normalizedUser.updatedAt ?? normalizedUser.createdAt ?? nowIso();

  return {
    pk: buildUserPk(normalizedUser.id),
    sk: USER_PERMISSIONS_SK,
    gsi1pk: `USER_PERMISSIONS#${normalizedUser.id}`,
    gsi1sk: USER_PERMISSIONS_SK,
    gsi2pk: `ROLE#${String(normalizedUser.role ?? "staff").toLowerCase()}`,
    gsi2sk: `USER#${normalizedUser.id}`,
    entityType: USER_PERMISSIONS_ENTITY,
    stage,
    userId: normalizedUser.id,
    role: normalizedUser.role ?? "staff",
    permissions: normalizeRlsMatrix(
      record.permissions,
      normalizedUser.role ?? "staff",
    ),
    createdAt: normalizedUser.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export async function syncAppUserRecord(record: AppUserRecord) {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();

  await Promise.all([
    client.send(
      new PutCommand({
        TableName: tableName,
        Item: toUserProfileItem(record.user),
      }),
    ),
    client.send(
      new PutCommand({
        TableName: tableName,
        Item: toUserPermissionsItem(record),
      }),
    ),
  ]);

  return {
    ...record,
    user: normalizeAppUser(record.user),
    permissions: normalizeRlsMatrix(record.permissions, record.user.role),
  };
}

export async function deleteAppUserRecord(userId: string) {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const pk = buildUserPk(userId);

  await Promise.all([
    client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { pk, sk: USER_PROFILE_SK },
      }),
    ),
    client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { pk, sk: USER_PERMISSIONS_SK },
      }),
    ),
  ]);
}

async function getUserRecordByPk(userId: string): Promise<AppUserRecord | null> {
  const tableName = getTableName();
  const pk = buildUserPk(userId);
  const client = getDynamoDocumentClient();

  const [profileResponse, permissionsResponse] = await Promise.all([
    client.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk, sk: USER_PROFILE_SK },
      }),
    ),
    client.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk, sk: USER_PERMISSIONS_SK },
      }),
    ),
  ]);

  const profileItem = profileResponse.Item as UserProfileItem | undefined;
  if (!profileItem) return null;

  const user = mapUserProfileItem(profileItem);
  const permissionsItem = permissionsResponse.Item as
    | UserPermissionsItem
    | undefined;

  return {
    user,
    permissions: normalizeRlsMatrix(
      permissionsItem?.permissions,
      user.role ?? "staff",
    ),
    source: "dynamodb",
  };
}

export async function getAppUserRecordById(
  userId: string,
): Promise<AppUserRecord | null> {
  return getUserRecordByPk(userId);
}

export async function getAppUserRecordByEmail(
  email: string,
): Promise<AppUserRecord | null> {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const response = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :gsi1pk and gsi1sk = :gsi1sk",
      ExpressionAttributeValues: {
        ":gsi1pk": buildUserEmailGsiPk(email),
        ":gsi1sk": USER_PROFILE_SK,
      },
      Limit: 1,
    }),
  );

  const profileItem = response.Items?.[0] as UserProfileItem | undefined;
  if (!profileItem?.id) return null;

  return getUserRecordByPk(String(profileItem.id));
}

export async function listAppUserRecords(filters?: {
  search?: string;
  role?: string;
  isActive?: boolean;
  excludeRole?: string;
}) {
  const tableName = getTableName();
  const client = getDynamoDocumentClient();
  const response = await client.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "entityType = :entityType",
      ExpressionAttributeValues: {
        ":entityType": USER_PROFILE_ENTITY,
      },
    }),
  );

  const items = (response.Items ?? []) as UserProfileItem[];
  const normalizedSearch = filters?.search?.trim().toLowerCase() || "";
  const roleFilter = filters?.role?.trim().toLowerCase() || "";
  const excludeRole = filters?.excludeRole?.trim().toLowerCase() || "";

  const filtered = items
    .map(mapUserProfileItem)
    .filter((user) => {
      if (roleFilter && user.role.toLowerCase() !== roleFilter) return false;
      if (excludeRole && user.role.toLowerCase() === excludeRole) return false;
      if (
        filters?.isActive !== undefined &&
        Boolean(user.isActive) !== filters.isActive
      ) {
        return false;
      }

      if (!normalizedSearch) return true;

      const haystack = [
        user.email,
        user.firstName,
        user.lastName,
        `${user.firstName} ${user.lastName}`.trim(),
        user.phone ?? "",
        user.region ?? "",
        user.area ?? "",
        user.role,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    })
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  return Promise.all(
    filtered.map(async (user) => ({
      user,
      permissions: await getAppUserPermissions(user.id, user.role),
      source: "dynamodb" as const,
    })),
  );
}

export async function createAppUserRecord(params: {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  phone?: string | null;
  region?: string | null;
  area?: string | null;
  avatarUrl?: string | null;
  createdUser?: string | null;
  createdBy?: string | null;
  updatedUser?: string | null;
  updatedBy?: string | null;
  permissions?: RlsMatrix;
}) {
  const userId = randomUUID();
  const createdAt = nowIso();
  const role = params.role ?? "staff";

  const record: AppUserRecord = {
    user: {
      id: userId,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      role,
      isActive: params.isActive ?? true,
      mustChangePassword: params.mustChangePassword ?? false,
      phone: params.phone ?? null,
      region: params.region ?? null,
      area: params.area ?? null,
      avatarUrl: params.avatarUrl ?? null,
      lastLoginAt: null,
      createdAt,
      updatedAt: createdAt,
      createdUser: params.createdUser ?? null,
      updatedUser: params.updatedUser ?? params.createdUser ?? null,
      createdBy: params.createdBy ?? null,
      updatedBy: params.updatedBy ?? params.createdBy ?? null,
    },
    permissions: normalizeRlsMatrix(
      params.permissions ?? defaultMatrixForRole(role),
      role,
    ),
    source: "dynamodb",
  };

  return syncAppUserRecord(record);
}

export async function updateAppUserRecord(
  userId: string,
  updates: Partial<AppUserProfile> & { permissions?: RlsMatrix },
) {
  const current = await getAppUserRecordById(userId);
  if (!current) return null;

  const nextRole = updates.role ?? current.user.role ?? "staff";
  const updatedUser: AppUserProfile = {
    ...current.user,
    ...updates,
    id: current.user.id,
    email: updates.email ? normalizeEmail(updates.email) : current.user.email,
    role: nextRole,
    updatedAt: nowIso(),
  };

  return syncAppUserRecord({
    user: updatedUser,
    permissions: normalizeRlsMatrix(
      updates.permissions ?? current.permissions,
      nextRole,
    ),
    source: "dynamodb",
  });
}

export async function getAppUserPermissions(userId: string, role: string) {
  if (role.toLowerCase() === "superadmin") {
    return defaultMatrixForRole("superadmin");
  }

  const record = await getAppUserRecordById(userId);
  if (!record) {
    return defaultMatrixForRole(role);
  }

  return normalizeRlsMatrix(record.permissions, role);
}

export async function setAppUserPermissions(
  userId: string,
  permissions: RlsMatrix,
) {
  const current = await getAppUserRecordById(userId);
  if (!current) return null;

  return syncAppUserRecord({
    ...current,
    permissions: normalizeRlsMatrix(permissions, current.user.role ?? "staff"),
  });
}

export async function listAppRlsUsers() {
  const users = await listAppUserRecords({ excludeRole: "superadmin" });
  return users.map((record) => ({
    id: record.user.id,
    email: record.user.email,
    firstName: record.user.firstName,
    lastName: record.user.lastName,
    role: record.user.role,
    isActive: record.user.isActive,
    permissions: record.permissions,
  }));
}

export async function markLegacyUserLastLogin(userId: string) {
  return updateAppUserRecord(userId, {
    lastLoginAt: nowIso(),
  });
}
