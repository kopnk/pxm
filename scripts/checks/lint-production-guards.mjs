import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const checks = [
  {
    file: "server/api/auth/logout.post.ts",
    forbidden: /console\.log\("SESSION ID:"/,
    message: "Logout endpoint must not log session IDs.",
  },
  {
    file: "server/utils/authorize.ts",
    forbidden: /rlsEnforced/,
    message: "requireRole must not bypass role checks after RLS.",
  },
  {
    file: "server/api/project_files/index.post.ts",
    forbidden: /public:\s*true/,
    message: "Project file bucket must not be created public.",
  },
];

const failures = [];

for (const check of checks) {
  const content = readFileSync(resolve(check.file), "utf8");
  if (check.forbidden.test(content)) {
    failures.push(`${check.file}: ${check.message}`);
  }
}

const legacyPaths = [
  "drizzle.config.ts",
  "server/auth/lucia.ts",
  "server/auth/lucia.d.ts",
  "server/db",
  "server/utils/supabase.ts",
];

for (const path of legacyPaths) {
  if (existsSync(resolve(path))) {
    failures.push(`Legacy Supabase/Postgres path must stay removed: ${path}`);
  }
}

const sourceRoots = [
  "components",
  "composables",
  "infra",
  "layouts",
  "lib",
  "middleware",
  "pages",
  "plugins",
  "server",
  "stores",
  "types",
  "utils",
];
const sourceExtensions = new Set([".ts", ".vue", ".js", ".mjs", ".cjs"]);
const forbiddenRuntimePatterns = [
  { pattern: /\bsupabase\b/i, message: "Supabase runtime reference is forbidden" },
  { pattern: /\bdrizzle\b/i, message: "Drizzle runtime reference is forbidden" },
  { pattern: /\bpostgres(?:ql)?\b/i, message: "Postgres runtime reference is forbidden" },
  { pattern: /\blucia\b/i, message: "Lucia runtime reference is forbidden" },
];

function walkFiles(root) {
  const fullRoot = resolve(root);
  if (!existsSync(fullRoot)) return [];

  const entries = readdirSync(fullRoot);
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(fullRoot, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (sourceExtensions.has(fullPath.slice(fullPath.lastIndexOf(".")))) {
      files.push(fullPath);
    }
  }

  return files;
}

for (const root of sourceRoots) {
  for (const file of walkFiles(root)) {
    const content = readFileSync(file, "utf8");
    for (const forbidden of forbiddenRuntimePatterns) {
      if (forbidden.pattern.test(content)) {
        failures.push(`${file}: ${forbidden.message}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("[lint-production-guards] ok");
