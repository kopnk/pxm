import { z } from "zod";

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

export const clientCreateSchema = z.object({
  name: z.string().min(1),

  npwp: optionalText,
  bankName: optionalText,
  bankAccount: optionalText,

  addressText: optionalText,
  addressMeta: z.object({}).passthrough().optional(),

  contactName: optionalText,
  contactPhone: optionalText,
  // Keep optional text to avoid blocking updates on legacy non-email data.
  contactEmail: optionalText,

  signatoryName: optionalText,
  signatoryTitle: optionalText,

  isActive: z.boolean().optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial();
