import "dotenv/config";
import { spawn } from "node:child_process";
import { resolveLocalDevConfig } from "./dev-stage-config.mjs";
import { spawnNuxt } from "../run-nuxt.mjs";

const args = new Set(process.argv.slice(2));
const config = resolveLocalDevConfig();

if (args.has("--help")) {
  console.log("Usage: node scripts/dev/dev-stage-dev.mjs");
  console.log(
    `Starts Nuxt UI on http://${config.uiHost}:${config.uiPort} and local API proxy on http://${config.apiProxyHost}:${config.apiProxyPort}`,
  );
  process.exit(0);
}

const env = {
  ...process.env,
  PXM_STAGE: config.stage,
  SESSION_COOKIE_SECURE: config.sessionCookieSecure,
  NUXT_PUBLIC_API_BASE_URL: config.apiBaseUrl,
  PXM_LOCAL_UI_HOST: config.uiHost,
  PXM_LOCAL_UI_PORT: config.uiPort,
  PXM_LOCAL_API_PROXY_HOST: config.apiProxyHost,
  PXM_LOCAL_API_PROXY_PORT: config.apiProxyPort,
  PXM_LOCAL_UI_ORIGIN: config.uiOrigin,
};

const children = [];

function start(name, command, commandArgs) {
  const options = { stdio: "inherit", env };
  const child = command
    ? spawn(command, commandArgs, options)
    : spawnNuxt(commandArgs, options);

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
    }
    shutdown(code ?? 0);
  });

  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("ui", null, ["dev", "--host", env.PXM_LOCAL_UI_HOST, "--port", env.PXM_LOCAL_UI_PORT]);
start("api-proxy", "node", ["scripts/dev/local-api-proxy.mjs"]);
