import { createError, type H3Event } from "h3";

/**
 * Normalized pathname for `/api/*` requests, shared by every server middleware
 * so auth, RLS and rate-limit decisions all look at the exact same path.
 * Returns `null` for non-API requests.
 */
export function resolveApiPath(event: H3Event): string | null {
  const url = event.node.req.url || "";
  const rawPath = url.split("?")[0] ?? "";

  let path: string;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid request path" });
  }

  if (!path.startsWith("/api/") && path !== "/api") return null;

  // Encoded traversal / duplicate separators could make the router and the
  // access checks disagree about which endpoint is being called.
  if (/(?:^|\/)\.\.?(?:\/|$)|\/\/|\\/.test(path)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid request path" });
  }

  return path;
}

export function requestMethod(event: H3Event): string {
  return (event.node.req.method || "GET").toUpperCase();
}

/** Routes reachable without a session. */
export function isPublicApiPath(path: string): boolean {
  return (
    path.startsWith("/api/auth/") ||
    path === "/api/health" ||
    path === "/api/ready"
  );
}

/** Routes a user with a pending forced password change may still call. */
export function isPasswordChangeApiCall(path: string, method: string): boolean {
  return (
    (method === "POST" && path === "/api/profile/change-password") ||
    (method === "GET" && path === "/api/profile")
  );
}
