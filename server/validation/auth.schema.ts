import { z } from "zod";

/**
 * LOGIN
 * ------------------------------------------------------------------
 * Purpose:
 * - Validate and normalize user credentials before authentication
 * - Prevent malformed payloads and unexpected input types
 *
 * Security notes:
 * - SQL Injection is already mitigated by Drizzle ORM (parameterized queries)
 * - This schema focuses on input integrity and normalization
 */
export const loginSchema = z.object({
  /**
   * User email address
   *
   * Important:
   * - Trimmed to remove leading/trailing whitespace
   * - Normalized to lowercase to ensure consistent lookup
   * - Explicitly rejects characters commonly used in injection attempts
   */
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Invalid email format")
    .max(255, "Email exceeds maximum length")
    .refine(
      (v) => !/[<>'"`;]/.test(v),
      "Email contains invalid characters"
    ),

  /**
   * User password (plain text, will be verified against hash)
   *
   * Important:
   * - Minimum length enforced to reduce weak-password attempts
   * - Maximum length prevents payload abuse
   */
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password exceeds maximum length"),
});

/**
 * LOGOUT
 * ------------------------------------------------------------------
 * No request body is required.
 * Schema is defined for future extensibility.
 */
export const logoutSchema = z.object({});

/**
 * ME
 * ------------------------------------------------------------------
 * Session-based endpoint.
 * No request body validation is required.
 */
export const meSchema = z.object({});
