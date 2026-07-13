import "dotenv/config";
import { spawn } from "node:child_process";
import { resolveLocalDevConfig } from "./dev-stage-config.mjs";

const config = resolveLocalDevConfig();
const env = {
  ...process.env,
  PXM_LOCAL_SPLIT_DEV: "true",
  PXM_STAGE: config.stage,
  NUXT_PUBLIC_API_BASE_URL: config.apiBaseUrl,
  NUXT_BUILD_DIR: config.buildDir,
  VITE_CACHE_DIR: config.viteCacheDir,
  PXM_LOCAL_UI_HOST: config.uiHost,
  PXM_LOCAL_UI_PORT: config.uiPort,
  PXM_LOCAL_API_PROXY_HOST: config.apiProxyHost,
  PXM_LOCAL_API_PROXY_PORT: config.apiProxyPort,
  PXM_LOCAL_UI_ORIGIN: config.uiOrigin,
};

const child = spawn(
  "npx",
  ["nuxt", "dev", "--host", env.PXM_LOCAL_UI_HOST, "--port", env.PXM_LOCAL_UI_PORT],
  {
    stdio: "inherit",
    shell: true,
    env,
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
