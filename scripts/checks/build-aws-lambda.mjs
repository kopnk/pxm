import { spawn } from "node:child_process";
import { access, rm } from "node:fs/promises";

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

const nuxtBuildDir = ".nuxt-lambda-build";
const viteCacheDir = "node_modules/.cache/vite-lambda-build";
const nitroOutputDir = ".output-lambda";

const env = {
  ...process.env,
  PXM_ALLOW_CUSTOM_BUILD_DIR: "true",
  NUXT_BUILD_DIR: nuxtBuildDir,
  VITE_CACHE_DIR: viteCacheDir,
  NITRO_OUTPUT_DIR: nitroOutputDir,
  NITRO_PRESET: "aws-lambda",
};

await rm(nuxtBuildDir, { recursive: true, force: true }).catch(() => {});
await rm(viteCacheDir, { recursive: true, force: true }).catch(() => {});
await rm(nitroOutputDir, { recursive: true, force: true }).catch(() => {});

await run("npx", ["nuxt", "build"], env);
await access(`${nitroOutputDir}/server/index.mjs`);
