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
