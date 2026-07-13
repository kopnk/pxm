import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(file) {
  return readFileSync(resolve(file), "utf8");
}

function compact(file) {
  return read(file).replace(/\s+/g, " ");
}

function expectIncludes(file, snippet, message) {
  assert.ok(compact(file).includes(snippet), message ?? `${file} should include ${snippet}`);
}

function expectRegex(file, pattern, message) {
  assert.ok(pattern.test(read(file)), message ?? `${file} should match ${pattern}`);
}

const rlsFile = "lib/rls.ts";
const apiAccessFile = "server/utils/apiAccessMap.ts";

expectRegex(
  rlsFile,
  /key:\s*"users"[\s\S]*?adminDefault:\s*"cru"[\s\S]*?staffDefault:\s*"none"/,
  "users RLS defaults must allow admin create/read/update and deny staff",
);
expectRegex(
  rlsFile,
  /key:\s*"project_financials"[\s\S]*?adminDefault:\s*"cru"[\s\S]*?staffDefault:\s*"r"/,
  "project_financials staff default must be read-only",
);
expectRegex(
  rlsFile,
  /key:\s*"project_progress"[\s\S]*?adminDefault:\s*"cru"[\s\S]*?staffDefault:\s*"ru"/,
  "project_progress staff default must allow read/update",
);
expectRegex(
  rlsFile,
  /key:\s*"progress_stage"[\s\S]*?route:\s*"\/progress-stage"[\s\S]*?adminDefault:\s*"cru"[\s\S]*?staffDefault:\s*"r"/,
  "progress_stage must have its own RLS route and defaults",
);
expectRegex(
  rlsFile,
  /key:\s*"dcn"[\s\S]*?adminDefault:\s*"cru"[\s\S]*?staffDefault:\s*"cru"/,
  "dcn staff default must allow create/read/update",
);
expectIncludes(
  rlsFile,
  'if (role?.toLowerCase() === "superadmin") return true;',
  "superadmin must bypass RLS matrix checks",
);
expectIncludes(
  rlsFile,
  "return Boolean(matrix?.[resource]?.[action]);",
  "non-superadmin access must follow the saved RLS checkbox matrix",
);
expectIncludes(
  "server/utils/deleteGuard.ts",
  "if (event.context.rlsEnforced) return null;",
  "delete guard must honor RLS-approved delete access before superadmin fallback",
);

expectIncludes(
  apiAccessFile,
  '...rulesFor("/api/users", "users", [ { pattern: /^\\/api\\/users\\/region-options(?:\\/|$)/, method: M.GET, resource: "users", action: "create" }, { pattern: /^\\/api\\/users\\/[^/]+\\/reset-password(?:\\/|$)/, method: M.POST, resource: "users", action: "update" }, { pattern: /^\\/api\\/users\\/signup(?:\\/|$)/, method: M.POST, resource: "users", action: "create" }, ]),',
  "users signup endpoint must map to users:create",
);
expectIncludes(
  apiAccessFile,
  '...rulesFor("/api/dcn", "dcn", [ { pattern: /^\\/api\\/dcn\\/next-number(?:\\/|$)/, method: M.GET, resource: "dcn", action: "read" }, ]),',
  "dcn next-number endpoint must map to dcn:read",
);
expectIncludes(
  apiAccessFile,
  '...rulesFor("/api/project_progress", "project_progress"),',
  "project progress CRUD routes must stay mapped to project_progress",
);
expectIncludes(
  apiAccessFile,
  '...rulesFor("/api/progress_stage", "progress_stage"),',
  "progress stage CRUD routes must map to progress_stage",
);
expectIncludes(
  apiAccessFile,
  '...rulesFor("/api/project_financials", "project_financials", [',
  "project financial CRUD routes must stay mapped to project_financials",
);

expectIncludes(
  "server/api/users/signup.post.ts",
  'requireRole(event, ["superadmin", "admin"])',
  "user signup must stay limited to superadmin/admin",
);
expectIncludes(
  "server/api/dcn/index.post.ts",
  'requireRole(event, ["superadmin", "admin", "staff"])',
  "dcn create must be allowed for staff per RLS policy",
);
expectIncludes(
  "server/api/dcn/[id].put.ts",
  'requireRole(event, ["superadmin", "admin", "staff"])',
  "dcn update must be allowed for staff per RLS policy",
);
expectIncludes(
  "server/api/project_progress/[id].put.ts",
  'requireRole(event, ["superadmin", "admin", "staff"])',
  "project progress update must be allowed for staff per RLS policy",
);
expectIncludes(
  "server/api/project_financials/[id].put.ts",
  'requireRole(event, ["admin", "superadmin"])',
  "project financial update must stay limited to admin/superadmin",
);

expectIncludes(
  "composables/useProjectProgressListPage.ts",
  'useListPagePermissions("progress_stage");',
  "project progress page must read progress stage access from RLS",
);
expectIncludes(
  "pages/project-progress/index.vue",
  'v-if="canReadProgressStage"',
  "progress stage shortcut must follow RLS read permission",
);
expectIncludes(
  "middleware/auth.global.ts",
  "if (!auth.canAccess(resource, action)) {",
  "frontend route guard must enforce RLS before entering protected pages",
);
expectIncludes(
  "stores/auth.ts",
  "return hasRlsPermission(matrix, resource, action, role);",
  "auth store must resolve permission checks from the normalized matrix",
);

console.log("[smoke-rls-crud] ok");
