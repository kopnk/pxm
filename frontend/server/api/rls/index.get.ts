import { defineEventHandler } from "h3";
import { requireRole } from "~/server/utils/authorize";
import { successResponse } from "~/server/utils/response";
import { listRlsUsers } from "~/server/utils/rlsPermissions";
export default defineEventHandler(async (event) => {
  const forbidden = requireRole(event, ["superadmin"]);
  if (forbidden) return forbidden;

  const users = await listRlsUsers();

  return successResponse(event, "RLS matrix loaded", { users });
});
