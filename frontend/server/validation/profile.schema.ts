import { z } from "zod";
import {
  getPasswordRuleErrors,
  PASSWORD_MIN_LENGTH,
} from "~/lib/passwordPolicy";

/**
 * CHANGE PASSWORD
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string({ error: "New password is required" })
      .min(
        PASSWORD_MIN_LENGTH,
        `New password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      )
      .superRefine((value, ctx) => {
        for (const message of getPasswordRuleErrors(value)) {
          ctx.addIssue({
            code: "custom",
            message,
          });
        }
      }),
    confirmPassword: z
      .string({ error: "Confirm password is required" }),
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
