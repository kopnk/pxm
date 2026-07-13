import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredFiles = [
  "server/api/auth/login.post.ts",
  "server/api/auth/logout.post.ts",
  "server/api/auth/me.get.ts",
  "server/api/projects/index.get.ts",
  "server/api/projects/index.post.ts",
  "server/api/projects/[id].get.ts",
  "server/api/projects/[id].put.ts",
  "server/api/projects/[id].delete.ts",
  "server/api/project_details/index.get.ts",
  "server/api/project_details/index.post.ts",
  "server/api/project_financials/index.get.ts",
  "server/api/project_financials/index.post.ts",
  "server/api/users/index.get.ts",
  "server/api/users/[id].put.ts",
  "server/api/health.get.ts",
  "server/api/ready.get.ts",
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(file))) {
    failures.push(`Missing critical route: ${file}`);
  }
}

if (existsSync(resolve("pages/users/[id].vue"))) {
  failures.push("Legacy broken route still exists: pages/users/[id].vue");
}

const authorize = readFileSync(resolve("server/utils/authorize.ts"), "utf8");
if (authorize.includes("rlsEnforced")) {
  failures.push("requireRole still references rlsEnforced");
}

const authMiddleware = readFileSync(resolve("server/middleware/01-auth.ts"), "utf8");
if (!authMiddleware.includes("signedPartnerPoPdfAccess")) {
  failures.push("Signed Partner PO PDF scoped auth context is missing");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("[smoke-critical-routes] ok");
