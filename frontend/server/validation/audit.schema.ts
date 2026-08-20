import { z } from "zod";

export const auditBulkDeleteSchema = z.object({
  ids: z
    .array(z.string().uuid("Invalid audit log ID"))
    .min(1, "At least one audit log must be selected"),
});
