import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { regions } from "./regions";
import { users } from "./users";

export const projectDetails = pgTable("project_details", {
  id: uuid("id").defaultRandom().primaryKey(),

  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),

cityKabId: uuid("city_kab_id")
  .references(() => regions.id)
  .notNull(),

  picArea: text("pic_area"),
  lineNumber: integer("line_number"),

  systemkey: text("systemkey"),
  neId: text("ne_id"),

  materialId: text("material_id"),
  materialName: text("material_name"),

  siteId: text("site_id"),
  siteName: text("site_name"),

  quantity: numeric("quantity", { precision: 12, scale: 2 }),
  uom: text("uom"),

  unitPrice: numeric("unit_price", { precision: 18, scale: 2 }),
  totalPrice: numeric("total_price", { precision: 18, scale: 2 }),

  status: text("status").default("active"),

  remarksProjectsDetails: text("remarks_projects_details"),
  remarksDelay: text("remarks_delay"),
  remarksCancel: text("remarks_cancel"),

  taxOut: numeric("tax_out", { precision: 18, scale: 4 }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

  createdUser: uuid("created_user")
    .references(() => users.id),
});
