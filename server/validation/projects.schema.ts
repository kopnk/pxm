import { z } from "zod";

export const createProjectSchema = z.object({
  contractNumber: z.string().nullable().optional(),
  prScNumber: z.string().min(1),
  poNumber: z.string().min(1),
  poDate: z.string(),
  deliveryDate: z.string().nullable().optional(),
  komDate: z.string().nullable().optional(),

  projectName: z.string().min(3),

  subTotal: z.number().optional(),
  discount: z.number().optional(),
  vatRate: z.number().optional(),

  pm: z.string().optional(),
  status: z.enum(["active", "closed", "cancelled"]).optional(),

  clientId: z.string().uuid().optional().nullable(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const queryProjectSchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  search: z.string().optional(),
  status: z.enum(["active", "closed", "cancelled"]).optional(),
});

/** Query untuk `GET /api/projects/export` (sama filter seperti list). */
export const projectsExportQueryZ = z.object({
  search: z.string().max(500).optional(),
  status: z.enum(["active", "closed", "cancelled"]).optional(),
});
