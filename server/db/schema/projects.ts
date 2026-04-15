import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { clients } from "./clients";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),

  contractNumber: text("contract_number"),
  prScNumber: text("pr_sc_number").notNull().unique(),
  poNumber: text("po_number").notNull().unique(),
  poDate: date("po_date").notNull(),
  deliveryDate: date("delivery_date"),
  komDate: date("kom_date"),

  projectName: text("project_name").notNull(),

  subTotal: numeric("sub_total", { precision: 18, scale: 2 }),
  discount: numeric("discount", { precision: 18, scale: 2 }).default("0"),
  netPrice: numeric("net_price", { precision: 18, scale: 2 }),

  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("11"),
  vatAmount: numeric("vat_amount", { precision: 18, scale: 2 }),
  grandTotal: numeric("grand_total", { precision: 18, scale: 2 }),

  status: text("status").default("active"), // active | closed | cancelled
  pm: text("pm"),

  clientId: uuid("client_id").references(() => clients.id),

  createdUser: uuid("created_user").references(() => users.id),

createdAt: timestamp("created_at", { withTimezone: true })
  .defaultNow()
  .notNull(),

updatedAt: timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull(),
});
