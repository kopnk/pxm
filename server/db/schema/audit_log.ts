import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // siapa yang melakukan aksi
    actorId: uuid("actor_id")
      .references(() => users.id, {
        onDelete: "set null",
      }),

    // CREATE | UPDATE | DELETE | LOGIN | LOGOUT | CHANGE_PASSWORD
    action: text("action").notNull(),

    // nama tabel target, contoh: "users"
    targetTable: text("target_table").notNull(),

    // id record yang terkena aksi
    targetId: uuid("target_id"),

    // data sebelum perubahan
    oldData: jsonb("old_data"),

    // data setelah perubahan
    newData: jsonb("new_data"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    idxActor: index("idx_audit_actor").on(table.actorId),

    idxTarget: index("idx_audit_target").on(
      table.targetTable,
      table.targetId
    ),

    idxCreatedAt: index("idx_audit_created_at").on(table.createdAt),
  })
);
