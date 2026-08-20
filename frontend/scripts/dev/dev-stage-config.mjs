export function resolveStageName(value = process.env.PXM_STAGE || "dev") {
  if (value === "dev" || value === "prod") {
    return value;
  }

  throw new Error(`Invalid stage "${value}". Use "dev" or "prod".`);
}

export function stackName(stage) {
  return `PxmStack-${resolveStageName(stage)}`;
}

export function resolveLocalDevConfig(env = process.env) {
  const stage = resolveStageName(env.PXM_STAGE || "dev");
  const uiHost = env.PXM_LOCAL_UI_HOST || "localhost";
  const uiPort = env.PXM_LOCAL_UI_PORT || "3000";
  const apiProxyHost = env.PXM_LOCAL_API_PROXY_HOST || "localhost";
  const apiProxyPort = env.PXM_LOCAL_API_PROXY_PORT || "3001";
  const uiOrigin = env.PXM_LOCAL_UI_ORIGIN || `http://${uiHost}:${uiPort}`;

  return {
    stage,
    sessionCookieSecure: env.SESSION_COOKIE_SECURE || "false",
    apiBaseUrl: env.NUXT_PUBLIC_API_BASE_URL || `http://${apiProxyHost}:${apiProxyPort}`,
    uiHost,
    uiPort,
    apiProxyHost,
    apiProxyPort,
    uiOrigin,
  };
}
