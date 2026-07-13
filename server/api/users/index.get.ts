import { defineEventHandler, getQuery, createError } from "h3";
import { successResponse } from "~/server/utils/response";
import { requireRole } from "~/server/utils/authorize";
import { buildPagination, buildTotalPages } from "~/lib/pagination";
import { toLocalTime } from "~/server/utils/datetime";
import { listAppUserRecords } from "~/server/utils/appUserStore";

export default defineEventHandler(async (event) => {

  const forbidden = requireRole(event, ["admin", "superadmin"]);
  if (forbidden) return forbidden;

  const actor = event.context.user;
  if (!actor) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const query = getQuery(event);
  const { page, limit, offset } = buildPagination(query);
  const records = await listAppUserRecords({
    search: query.search ? String(query.search) : undefined,
    role: query.role ? String(query.role) : undefined,
    isActive:
      query.isActive === undefined
        ? undefined
        : query.isActive === "true",
    excludeRole: "superadmin",
  });

  const total = records.length;
  const totalPages = buildTotalPages(total, limit);
  const pageItems = records.slice(offset, offset + limit);

  const items = pageItems.map((record) => {
    const user = record.user;
    const base = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt ? toLocalTime(user.lastLoginAt) : null,
      createdUser: user.createdUser ?? null,
      updatedUser: user.updatedUser ?? null,
      createdBy: user.createdBy ?? null,
      updatedBy: user.updatedBy ?? null,
      createdAt: toLocalTime(user.createdAt),
      updatedAt: toLocalTime(user.updatedAt),
    };

    if (actor.role === "superadmin") {
      return {
        ...base,
        phone: user.phone ?? null,
        region: user.region ?? null,
        area: user.area ?? null,
        avatarUrl: user.avatarUrl ?? null,
      };
    }

    return base;
  });

  return successResponse(event, "Users retrieved", {
    items,
    page,
    limit,
    total,
    totalPages,
  });
});
