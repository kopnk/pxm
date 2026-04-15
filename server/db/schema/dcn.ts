import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const dcnFlowEnum = pgEnum("dcn_flow", ["in", "out"]);

export const dcn = pgTable("dcn", {
  id: uuid("id").defaultRandom().primaryKey(),

  letterDate: date("letter_date").notNull(),
  number: varchar("number", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }),
  toAddress: varchar("to_address", { length: 255 }),
  fromAddress: varchar("from_address", { length: 255 }),
  subject: text("subject"),

  flow: dcnFlowEnum("flow").notNull(),

  createdUser: uuid("created_user").references(() => users.id),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
