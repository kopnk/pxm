import { z } from "zod";
import { RLS_ACTIONS, RLS_RESOURCES } from "~/lib/rls";

const actionSchema = z.object({
  create: z.boolean(),
  read: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
});

const matrixSchema = z.object(
  Object.fromEntries(
    RLS_RESOURCES.map((resource) => [resource, actionSchema]),
  ) as Record<(typeof RLS_RESOURCES)[number], typeof actionSchema>,
);

export const rlsUserIdParamSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const rlsUpdateSchema = z.object({
  permissions: matrixSchema,
});

export type RlsUpdateBody = z.infer<typeof rlsUpdateSchema>;
