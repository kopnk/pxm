import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const nuxtCli = resolve(import.meta.dirname, "../node_modules/nuxt/bin/nuxt.mjs");

export function spawnNuxt(args, options = {}) {
  return spawn(process.execPath, [nuxtCli, ...args], options);
}

export function spawnNuxtSync(args, options = {}) {
  return spawnSync(process.execPath, [nuxtCli, ...args], options);
}
