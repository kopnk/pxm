import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { sql } from "drizzle-orm";

export const progressStage = pgTable("progress_stage", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  code: text("code").notNull().unique(),
  name: text("name").notNull(),

  stageType: text("stage_type")
    .notNull()
    .$type<"admin" | "field" | "document">(),

  sequence: integer("sequence").notNull(),

  isRequired: boolean("is_required").default(true),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

  createdUser: uuid("created_user").references(() => users.id),
});
