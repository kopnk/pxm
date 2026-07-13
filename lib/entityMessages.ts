export const ENTITY_LABELS = {
  user: "User",
  client: "Client",
  partner: "Partner",
  dcn: "DCN",
  project: "Project",
  projectDetail: "Project detail",
  projectProgress: "Project progress",
  projectFinancial: "Project financial",
  profile: "Profile",
  password: "Password",
  auditLog: "Audit log",
  region: "Region",
  progressStage: "Progress stage",
  document: "Document",
  permissions: "Permissions",
} as const;

const ENTITY_PLURAL_LABELS: Record<EntityMessageKey, string> = {
  user: "users",
  client: "clients",
  partner: "partners",
  dcn: "DCN records",
  project: "projects",
  projectDetail: "project details",
  projectProgress: "project progress records",
  projectFinancial: "project financial records",
  profile: "profiles",
  password: "passwords",
  auditLog: "audit logs",
  region: "regions",
  progressStage: "progress stages",
  document: "documents",
  permissions: "permission sets",
};

export type EntityMessageKey = keyof typeof ENTITY_LABELS;
export type CrudAction = "created" | "updated" | "deleted";

export function crudActionMessage(
  entity: EntityMessageKey,
  action: CrudAction,
): string {
  return `${ENTITY_LABELS[entity]} ${action}`;
}

export function toastCrudSuccessMessage(
  entity: EntityMessageKey,
  action: CrudAction,
): string {
  return `Success! ${crudActionMessage(entity, action)}.`;
}

export function confirmDeleteMessage(
  entity: EntityMessageKey,
  label?: string | null,
): string {
  const normalized = label?.trim();

  if (!normalized) {
    return `Delete this ${ENTITY_LABELS[entity].toLowerCase()}?`;
  }

  return `Delete ${ENTITY_LABELS[entity]} "${normalized}"?`;
}

export function confirmBulkDeleteMessage(
  entity: EntityMessageKey,
  count: number,
): string {
  return `Delete ${count} selected ${ENTITY_PLURAL_LABELS[entity]}?`;
}

export function confirmDeleteDcnMessage(
  number?: string | null,
  letterDate?: string | null,
): string {
  const dcnNumber = number?.trim() || "(no number)";
  const dateLabel = letterDate?.trim() || "unknown date";

  return `Delete DCN "${dcnNumber}" dated ${dateLabel}?`;
}

export function confirmDeleteDocumentMessage() {
  return "Delete this document permanently?";
}

export function passwordResetToDefaultMessage() {
  return "Password reset to default. User must change it on next login.";
}

export function passwordChangeRequiredMessage() {
  return "Password change required";
}

export function passwordChangedSignInAgainMessage() {
  return "Password changed successfully. Please sign in again.";
}

export function sessionExpiredSignInAgainMessage() {
  return "Your session has expired. Please sign in again.";
}
