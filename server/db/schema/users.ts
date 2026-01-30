import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
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

  lastLoginAt: timestamp("last_login_at"),
  avatarUrl: text("avatar_url"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
