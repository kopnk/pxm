import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const regions = pgTable(
  "regions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: text("name").notNull(),

    // region | sub_region | city_kab
    type: text("type").notNull(),

    parentId: uuid("parent_id").references((): AnyPgColumn => regions.id, {
      onDelete: "cascade",
    }),

    createdUser: uuid("created_user").references(() => users.id),
    updatedUser: uuid("updated_user").references(() => users.id),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxParent: index("idx_regions_parent").on(table.parentId),
  }),
);

export const regionRelations = relations(regions, ({ one, many }) => ({
  parent: one(regions, {
    fields: [regions.parentId],
    references: [regions.id],
  }),

  children: many(regions),
}));
