import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnNuxtSync, stampServiceWorker } from "../run-nuxt.mjs";

const rootDir = resolve(import.meta.dirname, "../..");
const nuxtBuildDir = ".nuxt-prod-generate";
const viteCacheDir = "node_modules/.cache/vite-prod-generate";
const nitroOutputDir = ".output-prod-generate";
const generatedPublicDir = resolve(rootDir, nitroOutputDir, "public");

for (const path of [nuxtBuildDir, viteCacheDir, nitroOutputDir]) {
  rmSync(resolve(rootDir, path), { recursive: true, force: true });
}

const result = spawnNuxtSync(["generate"], {
  cwd: rootDir,
  env: {
    ...process.env,
    PXM_ALLOW_CUSTOM_BUILD_DIR: "true",
    NUXT_BUILD_DIR: nuxtBuildDir,
    VITE_CACHE_DIR: viteCacheDir,
    NITRO_OUTPUT_DIR: nitroOutputDir,
    NUXT_PUBLIC_API_BASE_URL: "/",
    PXM_PUBLIC_APP_URL:
      process.env.PXM_PUBLIC_APP_URL || "https://www.proxem.site",
  },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const generatedIndex = readFileSync(
  resolve(generatedPublicDir, "index.html"),
  "utf8",
);
stampServiceWorker(generatedPublicDir);

if (
  /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?|\/@vite\/client|[A-Za-z]:\//i.test(
    generatedIndex,
  )
) {
  throw new Error(
    "Production frontend contains development-only assets. Deployment stopped.",
  );
}

if (!generatedIndex.includes('apiBaseUrl:"/"')) {
  throw new Error(
    "Production frontend is not configured to use the same-origin API.",
  );
}

console.log("Frontend production guard passed: API base URL is same-origin (/).");
console.log(`Static frontend ready at ${generatedPublicDir}`);
