import { z } from "zod";

/**
 * COMMON
 */
export const userIdParamSchema = z.object({
  id: z.string().uuid("Invalid user id"),
});

export const userPhoneSchema = z
  .string({ error: "Phone is required" })
  .regex(/^08\d{8,13}$/, "Phone must start with 08 and be 10–15 digits");

/**
 * SIGNUP (CREATE USER)
 * Password is set server-side to the default; user must change on first login.
 */
export const userSignupSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .email("Invalid email format"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: userPhoneSchema,
  region: z.string().min(1, "Region is required"),
  area: z.string().min(1, "Area is required"),
  avatarUrl: z.string().url("Invalid avatar URL").optional(),
  role: z.enum(["admin", "staff"]).default("staff"),
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
    role: z.enum(["admin", "staff"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some(
        (v) => v !== undefined && v !== ""
      ),
    { message: "No valid fields to update" }
  );
