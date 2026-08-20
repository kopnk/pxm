import {
  type RlsMatrix,
} from "~/lib/rls";
import {
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

export async function listRlsUsers() {
  return listAppRlsUsers();
}
