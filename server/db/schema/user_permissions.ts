import { pgTable, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import type { RlsMatrix } from "~/lib/rls";

export const userPermissions = pgTable("user_permissions", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  permissions: jsonb("permissions").$type<RlsMatrix>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
