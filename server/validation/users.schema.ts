import { z } from "zod";

/**
 * COMMON
 */
export const userIdParamSchema = z.object({
  id: z.string().uuid("Invalid user id"),
});

/**
 * SIGNUP (CREATE USER)
 * ❗ password masih plaintext, DI-HASH di handler
 */
export const userSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(6).optional(),
  region: z.string().optional(),
  area: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  role: z.enum(["superadmin", "admin", "staff"]).default("staff"),
  isActive: z.boolean().optional(),
});

/**
 * UPDATE USER (ADMIN / SUPERADMIN)
 */
export const userUpdateSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().min(6).optional(),
    region: z.string().optional(),
    area: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    role: z.enum(["superadmin", "admin", "staff"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some(
        (v) => v !== undefined && v !== ""
      ),
    { message: "No valid fields to update" }
  );
