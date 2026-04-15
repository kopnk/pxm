import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  npwp: text("npwp").unique(),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),

  addressText: text("address_text"),
  addressMeta: jsonb("address_meta"),

  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),

  /** Signatory identity (invoice / tax document) */
  signatoryName: text("signatory_name"),
  signatoryTitle: text("signatory_title"),

  isActive: boolean("is_active").default(true),

createdAt: timestamp("created_at", { withTimezone: true })
  .defaultNow()
  .notNull(),

updatedAt: timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull(),
});
