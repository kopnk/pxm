import { z } from "zod";

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const optionalEmail = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}, z.string().email("Invalid contact email format").nullable().optional());

export const clientCreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),

  npwp: optionalText,
  bankName: optionalText,
  bankAccount: optionalText,

  addressText: optionalText,
  addressMeta: z.object({}).passthrough().optional(),

  contactName: optionalText,
  contactPhone: optionalText,
  contactEmail: optionalEmail,

  signatoryName: optionalText,
  signatoryTitle: optionalText,

  isActive: z.boolean().optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial();
