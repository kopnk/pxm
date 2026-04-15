import { z } from "zod";

const addressMetaSchema = z.object({
  province: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  postalCode: z.string().optional(),
}).optional();

export const createPartnerSchema = z.object({
  name: z.string().min(2),

  npwp: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  partnerType: z.string().optional(),

  addressText: z.string().optional(),
  addressMeta: addressMetaSchema,

  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),

  signatoryName: z.string().optional(),
  signatoryTitle: z.string().optional(),

  rating: z.number().min(0).max(5).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updatePartnerSchema = createPartnerSchema.partial();
