import { z } from "zod";

/**
 * LOGIN
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format"),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password minimal 6 karakter"),
});

/**
 * LOGOUT
 * (tidak ada body, tapi disiapkan kalau nanti perlu)
 */
export const logoutSchema = z.object({});

/**
 * ME
 * (tidak pakai body, session via cookie)
 */
export const meSchema = z.object({});
