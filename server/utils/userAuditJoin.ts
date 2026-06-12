import { alias } from "drizzle-orm/pg-core";
import { users } from "~/server/db/schema/users";
import { formatAuditUserEmail } from "~/server/utils/createdBy";

export type UserAuditAliases = ReturnType<typeof createUserAuditAliases>;

export function createUserAuditAliases() {
  return {
    creator: alias(users, "creator"),
    updater: alias(users, "updater"),
  };
}

export function userAuditNameSelect(
  creator: UserAuditAliases["creator"],
  updater: UserAuditAliases["updater"],
) {
  return {
    creatorEmail: creator.email,
    updaterEmail: updater.email,
  };
}

/** Drizzle alias tables need casting for leftJoin typing. */
export function asJoinTable<T>(table: T): T {
  return table;
}

export function auditUserNamesFromRow<
  T extends {
    creatorEmail?: string | null;
    updaterEmail?: string | null;
  },
>(row: T) {
  return {
    createdBy: formatAuditUserEmail(row.creatorEmail),
    updatedBy: formatAuditUserEmail(row.updaterEmail),
  };
}

export function mapRowAuditUsers<
  T extends {
    creatorEmail?: string | null;
    updaterEmail?: string | null;
  },
>(row: T) {
  const { creatorEmail, updaterEmail, ...rest } = row;

  return {
    ...rest,
    createdBy: formatAuditUserEmail(creatorEmail),
    updatedBy: formatAuditUserEmail(updaterEmail),
  };
}
