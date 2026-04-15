import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const regions = pgTable(
  "regions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: text("name").notNull(),

    // region | sub_region | city_kab
    type: text("type").notNull(),

    parentId: uuid("parent_id").references(() => regions.id, {
      onDelete: "cascade",
    }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    idxParent: index("idx_regions_parent").on(table.parentId),
  })
);

export const regionRelations = relations(regions, ({ one, many }) => ({
  parent: one(regions, {
    fields: [regions.parentId],
    references: [regions.id],
  }),

  children: many(regions),
}));
