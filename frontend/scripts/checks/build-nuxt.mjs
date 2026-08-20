import { spawn } from "node:child_process";
import { access, copyFile, mkdir, rm } from "node:fs/promises";
import { spawnNuxt } from "../run-nuxt.mjs";

const mode = process.argv[2];

const modes = {
  prod: {
    nuxtBuildDir: ".nuxt-build-verify",
    viteCacheDir: "node_modules/.cache/vite-build-verify",
    nitroOutputDir: ".output-build-verify",
    cleanupAfterBuild: true,
    verify: async (env) => {
      await run("node", ["scripts/checks/verify-no-dayjs.mjs"], env);
    },
  },
  lambda: {
    nuxtBuildDir: ".nuxt-lambda-build",
    viteCacheDir: "node_modules/.cache/vite-lambda-build",
    nitroOutputDir: ".output-lambda",
    cleanupAfterBuild: false,
    preset: "aws-lambda",
    verify: async (_env, outputDir) => {
      await access(`${outputDir}/server/index.mjs`);
      const assetDir = `${outputDir}/server/assets`;
      await mkdir(assetDir, { recursive: true });
      await copyFile("public/kopindosat.jpg", `${assetDir}/kopindosat.jpg`);
      await access(`${assetDir}/kopindosat.jpg`);
    },
  },
};

const selected = modes[mode];
if (!selected) {
  console.error("Usage: node scripts/checks/build-nuxt.mjs <prod|lambda>");
  process.exit(1);
}

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const options = { stdio: "inherit", env };
    const child = command === "node"
      ? spawn(process.execPath, args, options)
      : spawnNuxt(args, options);

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? 1}`));
    });
  });
}

async function cleanTransientArtifacts() {
  await Promise.all([
    rm(selected.nuxtBuildDir, { recursive: true, force: true }),
    rm(selected.viteCacheDir, { recursive: true, force: true }),
  ]);
}

async function cleanBuildArtifacts() {
  await Promise.all([
    cleanTransientArtifacts(),
    rm(selected.nitroOutputDir, { recursive: true, force: true }),
  ]);
}

const env = {
  ...process.env,
  PXM_ALLOW_CUSTOM_BUILD_DIR: "true",
  NUXT_BUILD_DIR: selected.nuxtBuildDir,
  VITE_CACHE_DIR: selected.viteCacheDir,
  NITRO_OUTPUT_DIR: selected.nitroOutputDir,
  ...(selected.preset ? { NITRO_PRESET: selected.preset } : {}),
};

await cleanBuildArtifacts();

try {
  await run("nuxt", ["build"], env);
  await selected.verify(env, selected.nitroOutputDir);
} finally {
  if (selected.cleanupAfterBuild) {
    await cleanBuildArtifacts();
  } else {
    await cleanTransientArtifacts();
  }
}
