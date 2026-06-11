export const MANAGEABLE_USER_ROLES = ["admin", "staff"] as const;

export type ManageableUserRole = (typeof MANAGEABLE_USER_ROLES)[number];

export function normalizeUserRole(role?: string | null): string {
  return String(role ?? "staff").toLowerCase();
}

export function isSuperadminRole(role?: string | null): boolean {
  return normalizeUserRole(role) === "superadmin";
}

/** Roles the actor may assign when creating a user. */
export function getCreatableUserRoles(actorRole?: string | null): ManageableUserRole[] {
  const actor = normalizeUserRole(actorRole);
  if (actor === "superadmin") return ["admin", "staff"];
  if (actor === "admin") return ["staff"];
  return [];
}

/** Roles the actor may assign when updating a non-superadmin user. */
export function getEditableUserRoles(
  actorRole?: string | null,
  targetRole?: string | null,
): ManageableUserRole[] {
  if (isSuperadminRole(targetRole)) return [];

  const actor = normalizeUserRole(actorRole);
  const target = normalizeUserRole(targetRole);

  if (actor === "superadmin") return ["admin", "staff"];
  if (actor === "admin" && target === "staff") return ["staff"];

  return [];
}

export function canManageUserInList(targetRole?: string | null): boolean {
  return !isSuperadminRole(targetRole);
}
