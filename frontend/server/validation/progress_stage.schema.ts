import { z } from "zod";

export const createProgressStageSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(3).max(100),
  stageType: z.enum(["admin", "field", "document"]),
  sequence: z.number().int().positive(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateProgressStageSchema =
  createProgressStageSchema.partial();
