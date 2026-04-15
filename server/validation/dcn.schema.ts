import { z } from "zod";

export const dcnFlowSchema = z.enum(["in", "out"]);

export const dcnCreateSchema = z.object({
  letterDate: z.string().min(1),
  number: z.string().min(1).max(100),
  type: z.string().max(50).optional().nullable(),
  toAddress: z.string().max(255).optional().nullable(),
  fromAddress: z.string().max(255).optional().nullable(),
  subject: z.string().optional().nullable(),
  flow: dcnFlowSchema,
});

export const dcnUpdateSchema = dcnCreateSchema.partial();
