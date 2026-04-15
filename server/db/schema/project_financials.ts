import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  timestamp,
  index,
  integer,
} from "drizzle-orm/pg-core";

import { users } from "./users";
import { projects } from "./projects";
import { projectDetails } from "./project_details";
import { clients } from "./clients";
import { partners } from "./partners";
import { projectProgress } from "./project_progress";

export const projectFinancials = pgTable(
  "project_financials",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),

    projectDetailId: uuid("project_detail_id")
      .references(() => projectDetails.id)
      .notNull(),

    // 🔥 NEW (core relation)
    projectProgressId: uuid("project_progress_id")
      .references(() => projectProgress.id),

    // tetap kolom biasa
    balapId: uuid("balap_id"),
    bastId: uuid("bast_id"),
    // tambahan: nomor/tanggal balap (bukan relasi ke table lain)
    balapNumber: text("balap_number"),
    balapDate: date("balap_date"),

    flowDirection: text("flow_direction", {
      enum: ["in", "out"],
    }).notNull(),

    status: text("status", {
      enum: ["draft", "issued", "approved", "paid", "cancelled"],
    })
      .notNull()
      .default("draft"),

    docType: text("doc_type"),
    docNumber: text("doc_number"),
    docDate: date("doc_date"),

    taxIn: numeric("tax_in", { precision: 18, scale: 4 }),
    taxOut: numeric("tax_out", { precision: 18, scale: 4 }),
    pph: numeric("pph", { precision: 18, scale: 4 }),

    note: text("note"),
    stage: integer("stage"),

    clientId: uuid("client_id").references(() => clients.id),
    partnerId: uuid("partner_id").references(() => partners.id),

    // ===== COMMON =====
    bastNumber: text("bast_number"),
    bastDate: date("bast_date"),

    // ===== PARTNER =====
    poNumberPartner: text("po_number_partner"),
    poDatePartner: date("po_date_partner"),

    invoiceNumberPartner: text("invoice_number_partner"),
    invoiceDatePartner: date("invoice_date_partner"),

    fpNumberPartner: text("fp_number_partner"),
    fpDatePartner: date("fp_date_partner"),

    qtyPartner: numeric("qty_partner", { precision: 18, scale: 4 }),
    unitPricePartner: numeric("unit_price_partner", {
      precision: 18,
      scale: 2,
    }),

    // ===== CLIENT =====
    poNumberClient: text("po_number_client"),
    poDateClient: date("po_date_client"),

    invoiceNumberClient: text("invoice_number_client"),
    invoiceDateClient: date("invoice_date_client"),

    fpNumberClient: text("fp_number_client"),
    fpDateClient: date("fp_date_client"),

    qtyClient: numeric("qty_client", { precision: 18, scale: 4 }),
    unitPriceClient: numeric("unit_price_client", {
      precision: 18,
      scale: 2,
    }),

    createdUser: uuid("created_user")
      .references(() => users.id)
      .notNull(),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    idxProject: index("idx_financial_project").on(table.projectId),
    idxDetail: index("idx_financial_detail").on(table.projectDetailId),

    idxProgress: index("idx_financial_progress").on(
      table.projectProgressId
    ),

    idxBalap: index("idx_financial_balap").on(table.balapId),
    idxBast: index("idx_financial_bast").on(table.bastId),

    idxFlow: index("idx_financial_flow").on(table.flowDirection),

    idxClient: index("idx_financial_client").on(table.clientId),
    idxPartner: index("idx_financial_partner").on(table.partnerId),

    idxProjectFlow: index("idx_financial_project_flow").on(
      table.projectId,
      table.flowDirection
    ),
  })
);