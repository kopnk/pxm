import { defineEventHandler } from "h3";
import { assertRateLimit } from "~/server/utils/rateLimit";

export default defineEventHandler((event) => {
  const url = event.node.req.url || "";
  const pathOnly = url.split("?")[0] ?? "";
  const method = (event.node.req.method || "GET").toUpperCase();

  if (method === "POST" && pathOnly === "/api/auth/login") {
    assertRateLimit(event, "auth-login", {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    return;
  }

  if (method === "GET" && pathOnly === "/api/project_financials/export") {
    assertRateLimit(event, "financial-export", {
      limit: 5,
      windowMs: 60 * 1000,
    });
    return;
  }

  if (
    method === "GET" &&
    (pathOnly.includes("/export") || pathOnly.startsWith("/api/reports/"))
  ) {
    assertRateLimit(event, "export-pdf", {
      limit: 30,
      windowMs: 60 * 1000,
    });
  }
});
