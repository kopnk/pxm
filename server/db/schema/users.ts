import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),

  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),

  region: text("region"),
  area: text("area"),

  role: text("role").default("staff"),
  phone: text("phone"),

  isActive: boolean("is_active").default(true),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),

  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  avatarUrl: text("avatar_url"),

  createdUser: uuid("created_user").references((): AnyPgColumn => users.id),
  updatedUser: uuid("updated_user").references((): AnyPgColumn => users.id),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
