import { defineEventHandler } from "h3";
import { assertRateLimit } from "~/server/utils/rateLimit";
import { requestMethod, resolveApiPath } from "~/server/utils/apiPath";

export default defineEventHandler((event) => {
  const path = resolveApiPath(event);
  if (!path) return;
  const method = requestMethod(event);

  if (method === "POST" && path === "/api/auth/login") {
    assertRateLimit(event, "auth-login", {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    return;
  }

  if (method === "GET" && path === "/api/project_financials/export") {
    assertRateLimit(event, "financial-export", {
      limit: 5,
      windowMs: 60 * 1000,
    });
    return;
  }

  if (
    method === "GET" &&
    (path.includes("/export") || path.startsWith("/api/reports/"))
  ) {
    assertRateLimit(event, "export-pdf", {
      limit: 30,
      windowMs: 60 * 1000,
    });
  }
});
