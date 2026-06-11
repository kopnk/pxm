import { createError } from "h3";
import {
  getCreatableUserRoles,
  getEditableUserRoles,
  isSuperadminRole,
  type ManageableUserRole,
} from "~/lib/userRoles";

export function assertCreatableUserRole(
  actorRole: string | undefined,
  requestedRole: string,
): void {
  if (isSuperadminRole(requestedRole)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Superadmin cannot be created from the application",
    });
  }

  const allowed = getCreatableUserRoles(actorRole);
  if (!allowed.includes(requestedRole as ManageableUserRole)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden role assignment",
    });
  }
}

export function assertAssignableUserRole(
  actorRole: string | undefined,
  currentTargetRole: string,
  requestedRole?: string,
): void {
  if (!requestedRole || requestedRole === currentTargetRole) return;

  if (isSuperadminRole(currentTargetRole)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Superadmin role cannot be changed",
    });
  }

  if (isSuperadminRole(requestedRole)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Cannot assign superadmin role",
    });
  }

  const allowed = getEditableUserRoles(actorRole, currentTargetRole);
  if (!allowed.includes(requestedRole as ManageableUserRole)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden role assignment",
    });
  }
}

export function assertNotSuperadminTarget(
  targetRole: string,
  action: "delete" | "update" | "reset_password",
): void {
  if (!isSuperadminRole(targetRole)) return;

  const messages = {
    delete: "Superadmin cannot be deleted",
    update: "Superadmin cannot be updated from user management",
    reset_password: "Superadmin password cannot be reset from user management",
  };

  throw createError({
    statusCode: 403,
    statusMessage: messages[action],
  });
}
