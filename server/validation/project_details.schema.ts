import { z } from "zod";

export const createProjectDetailSchema = z.object({
  projectId: z.string().uuid(),

  cityKabId: z.string().uuid(), // 🔥 ganti ini

  picArea: z.string().nullable().optional(),

  lineNumber: z.number().int().nullable().optional(),

  systemkey: z.string().min(1),
  neId: z.string().nullable().optional(),

  materialId: z.string().nullable().optional(),
  materialName: z.string().nullable().optional(),
  siteId: z.string().nullable().optional(),
  siteName: z.string().min(1),

  quantity: z.number().nonnegative(),
  uom: z.string().nullable().optional(),

  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative().nullable().optional(),

  status: z
    .enum(["active", "delay", "closed", "cancelled"])
    .nullable()
    .optional(),

  remarksProjectsDetails: z.string().nullable().optional(),
  remarksDelay: z.string().nullable().optional(),
  remarksCancel: z.string().nullable().optional(),

  taxOut: z.number().nullable().optional(),
});

/* ================= BULK ================= */

export const createProjectDetailBulkSchema = z.union([
  createProjectDetailSchema,
  z.array(createProjectDetailSchema),
]);

export const updateProjectDetailSchema =
  createProjectDetailSchema.partial();

export type CreateProjectDetailInput = z.infer<typeof createProjectDetailSchema>;
export type UpdateProjectDetailInput = z.infer<typeof updateProjectDetailSchema>;
