import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? 1}`));
    });
  });
}

const nuxtBuildDir = ".nuxt-build-verify";
const viteCacheDir = "node_modules/.cache/vite-build-verify";
const nitroOutputDir = ".output-build-verify";

const env = {
  ...process.env,
  PXM_LOCAL_SPLIT_DEV: "false",
  PXM_ALLOW_CUSTOM_BUILD_DIR: "true",
  NUXT_BUILD_DIR: nuxtBuildDir,
  VITE_CACHE_DIR: viteCacheDir,
  NITRO_OUTPUT_DIR: nitroOutputDir,
};

try {
  await rm(nuxtBuildDir, { recursive: true, force: true }).catch(() => {});
  await rm(viteCacheDir, { recursive: true, force: true }).catch(() => {});
  await rm(nitroOutputDir, { recursive: true, force: true }).catch(() => {});
  await run("npx", ["nuxt", "build"], env);
  await run("node", ["scripts/checks/verify-no-dayjs.mjs"], env);
} finally {
  await rm(nuxtBuildDir, { recursive: true, force: true }).catch(() => {});
  await rm(viteCacheDir, { recursive: true, force: true }).catch(() => {});
  await rm(nitroOutputDir, { recursive: true, force: true }).catch(() => {});
}
