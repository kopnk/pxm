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
  headers.set("access-control-expose-headers", "set-cookie,content-disposition");
  headers.set("vary", "origin");
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "Invalid request URL" }));
    return;
  }

  if (req.method === "OPTIONS") {
    const headers = new Headers();
    writeCorsHeaders(headers);
    res.writeHead(204, Object.fromEntries(headers.entries()));
    res.end();
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
          ...req.headers,
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
      const message =
        error instanceof Error ? error.message : "Local API proxy request failed";
      res.writeHead(502, {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": ALLOW_ORIGIN,
        "access-control-allow-credentials": "true",
      });
      res.end(
        JSON.stringify({
          success: false,
          statusCode: 502,
          message,
        }),
      );
    });

    req.pipe(proxyRequest);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Local API proxy request failed";
    res.writeHead(502, {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": ALLOW_ORIGIN,
      "access-control-allow-credentials": "true",
    });
    res.end(
      JSON.stringify({
        success: false,
        statusCode: 502,
        message,
      }),
    );
  }
});

server.listen(PROXY_PORT, PROXY_HOST, () => {
  console.log(
    `[local-api-proxy] http://${PROXY_HOST}:${PROXY_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`,
  );
});
