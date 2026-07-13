import {
  type RlsMatrix,
} from "~/lib/rls";
import {
  ensureAppUserPermissionsForRole,
  getAppUserPermissions,
  listAppRlsUsers,
  setAppUserPermissions,
} from "~/server/utils/appUserStore";

export async function getUserPermissionsMatrix(
  userId: string,
  role: string,
): Promise<RlsMatrix> {
  return getAppUserPermissions(userId, role);
}

export async function upsertUserPermissionsMatrix(
  userId: string,
  permissions: RlsMatrix,
): Promise<void> {
  await setAppUserPermissions(userId, permissions);
}

export async function ensureUserPermissionsForRole(
  userId: string,
  role: string,
): Promise<void> {
  if (role.toLowerCase() === "superadmin") return;
  await ensureAppUserPermissionsForRole(userId, role);
}

export async function listRlsUsers() {
  return listAppRlsUsers();
}
