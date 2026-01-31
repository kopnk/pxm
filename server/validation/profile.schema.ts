import { z } from "zod";

/**
 * CHANGE PASSWORD
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Current password is required" })
      .min(1),
    newPassword: z
      .string({ required_error: "New password is required" })
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z
      .string({ required_error: "Confirm password is required" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password confirmation does not match",
    path: ["confirmPassword"],
  });

/**
 * UPDATE PROFILE
 * ⚠️ hanya field yang boleh diupdate user sendiri
 */
export const updateProfileSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().min(6).optional(),
    region: z.string().optional(),
    area: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  })
  // ✅ PERBAIKAN FINAL
  .refine(
    (data) =>
      Object.values(data).some(
        (v) => v !== undefined && v !== ""
      ),
    {
      message: "No valid fields to update",
    }
  );
