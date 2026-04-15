import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";

export const partners = pgTable("partners", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  npwp: text("npwp").unique(),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  partnerType: text("partner_type"),

  addressText: text("address_text"),
  addressMeta: jsonb("address_meta"),

  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),

  signatoryName: text("signatory_name"),
  signatoryTitle: text("signatory_title"),

  rating: numeric("rating", { precision: 2, scale: 1 }),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
