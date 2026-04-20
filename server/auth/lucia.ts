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
    name: "pxm_session",
    expires: true, // 🔥 PERSISTENT COOKIE
    attributes: {
      /**
       * `Secure` cookies are NOT sent over plain HTTP. VPS accessed as http://IP must use
       * SESSION_COOKIE_SECURE unset/false. Use SESSION_COOKIE_SECURE=true when the site is HTTPS only.
       */
      secure: process.env.SESSION_COOKIE_SECURE === "true",
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