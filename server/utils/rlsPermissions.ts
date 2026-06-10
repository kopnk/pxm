import { eq, ne, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema/users";
import { userPermissions } from "~/server/db/schema/user_permissions";
import {
  type RlsMatrix,
  defaultMatrixForRole,
  normalizeRlsMatrix,
} from "~/lib/rls";
import { dbTime } from "~/server/utils/dbTime";

export async function getUserPermissionsMatrix(
  userId: string,
  role: string,
): Promise<RlsMatrix> {
  if (role.toLowerCase() === "superadmin") {
    return defaultMatrixForRole("superadmin");
  }

  const row = await db
    .select({ permissions: userPermissions.permissions })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId))
    .limit(1)
    .then((r) => r[0]);

  if (row?.permissions) {
    return normalizeRlsMatrix(row.permissions, role);
  }

  return defaultMatrixForRole(role);
}

export async function upsertUserPermissionsMatrix(
  userId: string,
  permissions: RlsMatrix,
): Promise<void> {
  const now = dbTime();

  await db
    .insert(userPermissions)
    .values({
      userId,
      permissions,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userPermissions.userId,
      set: {
        permissions,
        updatedAt: now,
      },
    });
}

export async function ensureUserPermissionsForRole(
  userId: string,
  role: string,
): Promise<void> {
  if (role.toLowerCase() === "superadmin") return;

  const existing = await db
    .select({ userId: userPermissions.userId })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId))
    .limit(1);

  if (existing.length) return;

  await upsertUserPermissionsMatrix(userId, defaultMatrixForRole(role));
}

export async function listRlsUsers() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      permissions: userPermissions.permissions,
    })
    .from(users)
    .leftJoin(userPermissions, eq(userPermissions.userId, users.id))
    .where(ne(sql`lower(coalesce(${users.role}, ''))`, "superadmin"))
    .orderBy(users.email);

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role ?? "staff",
    isActive: row.isActive ?? true,
    permissions: normalizeRlsMatrix(row.permissions, row.role ?? "staff"),
  }));
}
