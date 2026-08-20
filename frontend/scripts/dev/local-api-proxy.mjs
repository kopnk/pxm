import "dotenv/config";
import { createServer, request as httpRequest } from "node:http";
import { resolveLocalDevConfig } from "./dev-stage-config.mjs";

const args = new Set(process.argv.slice(2));
const config = resolveLocalDevConfig();

if (args.has("--help")) {
  console.log("Usage: node scripts/dev/local-api-proxy.mjs");
  console.log(
    `Starts the local dev API proxy on http://${config.apiProxyHost}:${config.apiProxyPort}`,
  );
  process.exit(0);
}

const PROXY_HOST = config.apiProxyHost;
const PROXY_PORT = Number(config.apiProxyPort);
const TARGET_HOST = config.uiHost;
const TARGET_PORT = Number(config.uiPort);
const ALLOW_ORIGIN = config.uiOrigin;
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return origin === ALLOW_ORIGIN;
}

function sanitizeProxyRequestHeaders(headers) {
  const next = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    next[key] = value;
  }

  return next;
}

function writeCorsHeaders(headers) {
  headers.set("access-control-allow-origin", ALLOW_ORIGIN);
  headers.set("access-control-allow-credentials", "true");
  headers.set(
    "access-control-allow-methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
  );
  headers.set(
    "access-control-allow-headers",
    "authorization,content-type,x-requested-with,x-csrf-token",
  );
  headers.set("access-control-expose-headers", "content-disposition");
  headers.set("vary", "origin");
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "Invalid request URL" }));
    return;
  }

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(req.headers.origin)) {
      res.writeHead(403, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ success: false, message: "Origin not allowed" }));
      return;
    }
    const headers = new Headers();
    writeCorsHeaders(headers);
    res.writeHead(204, Object.fromEntries(headers.entries()));
    res.end();
    return;
  }

  if (!isAllowedOrigin(req.headers.origin)) {
    res.writeHead(403, {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": ALLOW_ORIGIN,
      "access-control-allow-credentials": "true",
      vary: "origin",
    });
    res.end(JSON.stringify({ success: false, message: "Origin not allowed" }));
    return;
  }

  try {
    const proxyRequest = httpRequest(
      {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        method: req.method,
        path: req.url,
        headers: {
          ...sanitizeProxyRequestHeaders(req.headers),
          host: `${TARGET_HOST}:${TARGET_PORT}`,
        },
      },
      (proxyResponse) => {
        const responseHeaders = new Headers();

        for (const [key, value] of Object.entries(proxyResponse.headers)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            responseHeaders.set(key, value.join(", "));
            continue;
          }
          responseHeaders.set(key, value);
        }

        writeCorsHeaders(responseHeaders);

        const nodeHeaders = Object.fromEntries(responseHeaders.entries());
        const setCookies = proxyResponse.headers["set-cookie"];
        if (setCookies?.length) {
          nodeHeaders["set-cookie"] = setCookies;
        }

        res.writeHead(proxyResponse.statusCode ?? 502, nodeHeaders);
        proxyResponse.pipe(res);
      },
    );

    proxyRequest.on("error", (error) => {
      res.writeHead(502, {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": ALLOW_ORIGIN,
        "access-control-allow-credentials": "true",
        vary: "origin",
      });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 502,
          message: "Local API proxy request failed",
        }),
      );
    });

    req.pipe(proxyRequest);
  } catch (error) {
    res.writeHead(502, {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": ALLOW_ORIGIN,
      "access-control-allow-credentials": "true",
      vary: "origin",
    });
    res.end(
      JSON.stringify({
        success: false,
        statusCode: 502,
        message: "Local API proxy request failed",
      }),
    );
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`[local-api-proxy] port ${PROXY_PORT} is already in use`);
  } else {
    console.error("[local-api-proxy] server failed", error);
  }
  process.exitCode = 1;
});

server.listen(PROXY_PORT, PROXY_HOST, () => {
  console.log(
    `[local-api-proxy] http://${PROXY_HOST}:${PROXY_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`,
  );
});
