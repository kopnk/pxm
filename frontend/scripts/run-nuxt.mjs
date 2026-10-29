import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const nuxtCli = resolve(import.meta.dirname, "../node_modules/nuxt/bin/nuxt.mjs");

/** All deployment modes must rotate the PWA cache with the Nuxt build. */
export function stampServiceWorker(publicDir) {
  const metadata = JSON.parse(readFileSync(resolve(publicDir, "_nuxt/builds/latest.json"), "utf8"));
  const buildId = String(metadata?.id ?? "").trim();
  if (!/^[a-zA-Z0-9-]+$/.test(buildId)) {
    throw new Error("Production frontend has an invalid or missing build ID.");
  }
  const workerPath = resolve(publicDir, "sw.js");
  const worker = readFileSync(workerPath, "utf8");
  if (!worker.includes("__PXM_BUILD_ID__")) {
    throw new Error("Service worker build ID placeholder was not found.");
  }
  writeFileSync(workerPath, worker.replaceAll("__PXM_BUILD_ID__", buildId), "utf8");
}

export function spawnNuxt(args, options = {}) {
  return spawn(process.execPath, [nuxtCli, ...args], options);
}

export function spawnNuxtSync(args, options = {}) {
  return spawnSync(process.execPath, [nuxtCli, ...args], options);
}
