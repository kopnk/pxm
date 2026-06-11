import { alias } from "drizzle-orm/pg-core";
import { users } from "~/server/db/schema/users";
import { formatCreatorName } from "~/server/utils/createdBy";

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
    creatorFirstName: creator.firstName,
    creatorLastName: creator.lastName,
    updaterFirstName: updater.firstName,
    updaterLastName: updater.lastName,
  };
}

/** Drizzle alias tables need casting for leftJoin typing. */
export function asJoinTable<T>(table: T): T {
  return table;
}

export function auditUserNamesFromRow<
  T extends {
    creatorFirstName?: string | null;
    creatorLastName?: string | null;
    updaterFirstName?: string | null;
    updaterLastName?: string | null;
  },
>(row: T) {
  return {
    createdBy: formatCreatorName(row.creatorFirstName, row.creatorLastName),
    updatedBy: formatCreatorName(row.updaterFirstName, row.updaterLastName),
  };
}

export function mapRowAuditUsers<
  T extends {
    creatorFirstName?: string | null;
    creatorLastName?: string | null;
    updaterFirstName?: string | null;
    updaterLastName?: string | null;
  },
>(row: T) {
  const {
    creatorFirstName,
    creatorLastName,
    updaterFirstName,
    updaterLastName,
    ...rest
  } = row;

  return {
    ...rest,
    createdBy: formatCreatorName(creatorFirstName, creatorLastName),
    updatedBy: formatCreatorName(updaterFirstName, updaterLastName),
  };
}
