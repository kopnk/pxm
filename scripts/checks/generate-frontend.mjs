import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = resolve(import.meta.dirname, "../..");
const nuxi = resolve(
  rootDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "nuxi.cmd" : "nuxi",
);

const result = spawnSync(nuxi, ["generate"], {
  cwd: rootDir,
  env: {
    ...process.env,
    NUXT_PUBLIC_API_BASE_URL: "/",
    PXM_PUBLIC_APP_URL:
      process.env.PXM_PUBLIC_APP_URL || "https://www.proxem.site",
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const generatedIndex = readFileSync(
  resolve(rootDir, ".output", "public", "index.html"),
  "utf8",
);

if (/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(generatedIndex)) {
  throw new Error(
    "Production frontend contains a localhost URL. Deployment stopped.",
  );
}

if (!generatedIndex.includes('apiBaseUrl:"/"')) {
  throw new Error(
    "Production frontend is not configured to use the same-origin API.",
  );
}

console.log("Frontend production guard passed: API base URL is same-origin (/).");
