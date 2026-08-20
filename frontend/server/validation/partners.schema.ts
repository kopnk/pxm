import { z } from "zod";

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().optional(),
);

const optionalEmail = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().email("Invalid contact email format").optional(),
);

const optionalRating = z.preprocess(
  (value) => {
    if (value === undefined) return undefined;
    if (value === "" || value === null) return null;
    return Number(value);
  },
  z
    .number()
    .min(0, "Rating must be at least 0")
    .max(5, "Rating must be at most 5")
    .nullable()
    .optional(),
);

const addressMetaSchema = z.object({
  province: optionalText,
  city: optionalText,
  district: optionalText,
  postalCode: optionalText,
}).optional();

export const createPartnerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),

  npwp: optionalText,
  bankName: optionalText,
  bankAccount: optionalText,
  partnerType: optionalText,

  addressText: optionalText,
  addressMeta: addressMetaSchema,

  contactName: optionalText,
  contactPhone: optionalText,
  contactEmail: optionalEmail,

  signatoryName: optionalText,
  signatoryTitle: optionalText,

  rating: optionalRating,
  isActive: z.boolean().optional(),
});

export const updatePartnerSchema = createPartnerSchema.partial();
