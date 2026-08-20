import "dotenv/config";
import { resolveLocalDevConfig } from "./dev-stage-config.mjs";
import { spawnNuxt } from "../run-nuxt.mjs";

const config = resolveLocalDevConfig();
const env = {
  ...process.env,
  PXM_STAGE: config.stage,
  NUXT_PUBLIC_API_BASE_URL: config.apiBaseUrl,
  PXM_LOCAL_UI_HOST: config.uiHost,
  PXM_LOCAL_UI_PORT: config.uiPort,
  PXM_LOCAL_API_PROXY_HOST: config.apiProxyHost,
  PXM_LOCAL_API_PROXY_PORT: config.apiProxyPort,
  PXM_LOCAL_UI_ORIGIN: config.uiOrigin,
};

const child = spawnNuxt(
  ["dev", "--host", env.PXM_LOCAL_UI_HOST, "--port", env.PXM_LOCAL_UI_PORT],
  {
    stdio: "inherit",
    env,
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
