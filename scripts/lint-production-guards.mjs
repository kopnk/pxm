import { readFileSync } from "node:fs";
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

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("[lint-production-guards] ok");
