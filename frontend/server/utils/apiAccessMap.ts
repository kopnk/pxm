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
  // Specific sub-routes first, otherwise the generic `/:id` rule would shadow them.
  return [
    ...extra,
    { pattern: new RegExp(`^${base}/export(?:/|$)`), method: M.GET, resource, action: "read" },
    { pattern: new RegExp(`^${base}/?$`), method: M.GET, resource, action: "read" },
    { pattern: new RegExp(`^${base}/?$`), method: M.POST, resource, action: "create" },
    { pattern: new RegExp(`^${base}/[^/]+/?$`), method: M.GET, resource, action: "read" },
    { pattern: new RegExp(`^${base}/[^/]+/?$`), method: M.PUT, resource, action: "update" },
    { pattern: new RegExp(`^${base}/[^/]+/?$`), method: M.DELETE, resource, action: "delete" },
  ];
}

/** Central API → RLS mapping. Any `/api` route missing here is rejected (fail closed). */
export const API_ACCESS_RULES: ApiAccessRule[] = [
  ...rulesFor("/api/projects", "projects"),
  ...rulesFor("/api/project_details", "project_details"),
  ...rulesFor("/api/project_progress", "project_progress"),
  ...rulesFor("/api/progress_stage", "progress_stage"),
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
    { pattern: /^\/api\/users\/region-options(?:\/|$)/, method: M.GET, resource: "users", action: "read" },
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
  {
    pattern: /^\/api\/regions\/parent-options(?:\/|$)/,
    method: M.GET,
    resource: "regions",
    action: "read",
  },
  ...rulesFor("/api/regions", "regions"),
  { pattern: /^\/api\/reports\//, method: M.GET, resource: "project_financials", action: "read" },
];

/**
 * Endpoints that run their own authorization inside the handler:
 * - `/api/rls*` is superadmin-only (`requireRole`).
 * - `/api/project_files*` checks the RLS resource of the referenced record.
 */
const RLS_EXEMPT_PATTERNS = [/^\/api\/rls(?:\/|$)/, /^\/api\/project_files(?:\/|$)/];

export function isRlsExemptApiPath(path: string): boolean {
  return RLS_EXEMPT_PATTERNS.some((pattern) => pattern.test(path));
}

export function resolveApiAccess(
  path: string,
  method: string,
): { resource: RlsResource; action: RlsAction } | null {
  for (const rule of API_ACCESS_RULES) {
    if (rule.method === method && rule.pattern.test(path)) {
      return { resource: rule.resource, action: rule.action };
    }
  }

  return null;
}
