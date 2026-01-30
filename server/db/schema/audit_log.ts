import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),

  // siapa yang melakukan aksi
  actorId: uuid("actor_id").notNull(),

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

  createdAt: timestamp("created_at").defaultNow(),
});
