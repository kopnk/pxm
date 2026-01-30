import { Lucia, TimeSpan } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "~/server/db";
import { sessions, users } from "~/server/db/schema";

const adapter = new DrizzlePostgreSQLAdapter(
  db,
  sessions,
  users
);

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: new TimeSpan(3, "h"),

  sessionCookie: {
    name: "pms_session",
    expires: true, // 🔥 PERSISTENT COOKIE
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // 🔥 PENTING
      path: "/",
      httpOnly: true,
    },
  },

  getUserAttributes: (attributes) => ({
    email: attributes.email,
    role: attributes.role,
    isActive: attributes.isActive,
  }),
})


// Jangan lupa declare types
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      role: string;
      isActive: boolean;
    };
  }
}