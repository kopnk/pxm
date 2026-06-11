import type { H3Event } from "h3";
import type { RlsAction, RlsResource } from "~/lib/rls";

type ApiAccessRule = {
  pattern: RegExp;
  method: string;
  resource: RlsResource;
  action: RlsAction;
};

const M = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
} as const;

function rulesFor(
  prefix: string,
  resource: RlsResource,
  extra: ApiAccessRule[] = [],
): ApiAccessRule[] {
  const base = prefix.replace(/\/$/, "");
  return [
    { pattern: new RegExp(`^${base}/export(?:/|$)`), method: M.GET, resource, action: "read" },
    { pattern: new RegExp(`^${base}/?$`), method: M.GET, resource, action: "read" },
    { pattern: new RegExp(`^${base}/?$`), method: M.POST, resource, action: "create" },
    { pattern: new RegExp(`^${base}/[^/]+/?$`), method: M.GET, resource, action: "read" },
    { pattern: new RegExp(`^${base}/[^/]+/?$`), method: M.PUT, resource, action: "update" },
    { pattern: new RegExp(`^${base}/[^/]+/?$`), method: M.DELETE, resource, action: "delete" },
    ...extra,
  ];
}

/** Central API → RLS mapping. Auth/RLS admin routes are excluded in middleware. */
export const API_ACCESS_RULES: ApiAccessRule[] = [
  ...rulesFor("/api/projects", "projects"),
  ...rulesFor("/api/project_details", "project_details"),
  ...rulesFor("/api/project_progress", "project_progress"),
  ...rulesFor("/api/project_financials", "project_financials", [
    { pattern: /^\/api\/project_financials\/export-tax-in(?:\/|$)/, method: M.GET, resource: "tax_in", action: "read" },
    { pattern: /^\/api\/project_financials\/export-tax-out(?:\/|$)/, method: M.GET, resource: "tax_out", action: "read" },
    { pattern: /^\/api\/project_financials\/export-pph(?:\/|$)/, method: M.GET, resource: "pph", action: "read" },
  ]),
  ...rulesFor("/api/dcn", "dcn", [
    { pattern: /^\/api\/dcn\/next-number(?:\/|$)/, method: M.GET, resource: "dcn", action: "read" },
  ]),
  ...rulesFor("/api/clients", "clients"),
  ...rulesFor("/api/partners", "partners"),
  ...rulesFor("/api/users", "users", [
    { pattern: /^\/api\/users\/region-options(?:\/|$)/, method: M.GET, resource: "users", action: "create" },
    { pattern: /^\/api\/users\/[^/]+\/reset-password(?:\/|$)/, method: M.POST, resource: "users", action: "update" },
    { pattern: /^\/api\/users\/signup(?:\/|$)/, method: M.POST, resource: "users", action: "create" },
  ]),
  ...rulesFor("/api/audit", "audit_log", [
    { pattern: /^\/api\/audit\/bulk-delete(?:\/|$)/, method: M.POST, resource: "audit_log", action: "delete" },
  ]),
  { pattern: /^\/api\/profile\/avatar(?:\/|$)/, method: M.POST, resource: "profile", action: "update" },
  { pattern: /^\/api\/profile\/change-password(?:\/|$)/, method: M.POST, resource: "change_password", action: "update" },
  { pattern: /^\/api\/profile\/?$/, method: M.GET, resource: "profile", action: "read" },
  { pattern: /^\/api\/profile\/?$/, method: M.PUT, resource: "profile", action: "update" },
  { pattern: /^\/api\/project_files\/?$/, method: M.GET, resource: "project_financials", action: "read" },
  { pattern: /^\/api\/project_files\/?$/, method: M.POST, resource: "project_financials", action: "create" },
  { pattern: /^\/api\/project_files\/[^/]+\/?$/, method: M.GET, resource: "project_financials", action: "read" },
  { pattern: /^\/api\/project_files\/[^/]+\/?$/, method: M.PUT, resource: "project_financials", action: "update" },
  { pattern: /^\/api\/project_files\/[^/]+\/?$/, method: M.DELETE, resource: "project_financials", action: "delete" },
  {
    pattern: /^\/api\/regions\/parent-options(?:\/|$)/,
    method: M.GET,
    resource: "regions",
    action: "read",
  },
  ...rulesFor("/api/regions", "regions"),
  { pattern: /^\/api\/progress_stage\/?$/, method: M.GET, resource: "project_progress", action: "read" },
  { pattern: /^\/api\/progress_stage\/?$/, method: M.POST, resource: "project_progress", action: "create" },
  { pattern: /^\/api\/progress_stage\/[^/]+\/?$/, method: M.GET, resource: "project_progress", action: "read" },
  { pattern: /^\/api\/progress_stage\/[^/]+\/?$/, method: M.PUT, resource: "project_progress", action: "update" },
  { pattern: /^\/api\/progress_stage\/[^/]+\/?$/, method: M.DELETE, resource: "project_progress", action: "delete" },
  { pattern: /^\/api\/reports\//, method: M.GET, resource: "project_financials", action: "read" },
  { pattern: /^\/api\/dashboard\//, method: M.POST, resource: "dashboard", action: "read" },
];

const API_ACCESS_EXEMPT_PREFIXES = [
  "/api/auth/",
  "/api/rls",
];

export function resolveApiAccess(
  event: H3Event,
): { resource: RlsResource; action: RlsAction } | null {
  const url = event.node.req.url || "";
  const pathOnly = url.split("?")[0] ?? "";
  const method = (event.node.req.method || "GET").toUpperCase();

  if (API_ACCESS_EXEMPT_PREFIXES.some((p) => pathOnly.startsWith(p))) {
    return null;
  }

  for (const rule of API_ACCESS_RULES) {
    if (rule.method === method && rule.pattern.test(pathOnly)) {
      return { resource: rule.resource, action: rule.action };
    }
  }

  return null;
}
