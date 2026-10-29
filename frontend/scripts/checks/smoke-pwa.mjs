import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { stampServiceWorker } from "../run-nuxt.mjs";

const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
const cacheName = "pxm-cache-__PXM_BUILD_ID__";

function worker({ offline = false, storageFull = false, headers = {} } = {}) {
  const handlers = {};
  const writes = [];
  const deleted = [];
  const cache = {
    addAll: async (urls) => writes.push(...urls),
    put: async (request) => {
      if (storageFull) throw new Error("Quota exceeded");
      writes.push(request.url);
    },
    match: async (request) => new Response(request === "/offline.html" ? "offline" : "asset"),
  };
  runInNewContext(source, {
    URL, Response,
    self: {
      location: { origin: "https://pxm.test" },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      skipWaiting() {},
      clients: { claim() {} },
    },
    caches: {
      open: async (name) => { assert.equal(name, cacheName); return cache; },
      keys: async () => [cacheName, "pxm-cache-old", "another-app-cache"],
      delete: async (name) => deleted.push(name),
    },
    fetch: async () => {
      if (offline) throw new Error("Offline");
      return new Response("network", { headers });
    },
  });
  async function fetchRequest(path, options = {}) {
    let response;
    const pending = [];
    handlers.fetch({
      request: { url: `https://pxm.test${path}`, method: "GET", mode: "cors", destination: "image", ...options },
      respondWith: (result) => { response = result; },
      waitUntil: (result) => pending.push(result),
    });
    const result = await response;
    await Promise.all(pending);
    return result;
  }
  return { handlers, writes, deleted, fetchRequest };
}

test("API, account files, external assets and mutations bypass the offline cache", async () => {
  const app = worker();
  for (const path of ["/api/projects", "/api/project_files/private", "/avatars/user.png", "/documents/invoice.pdf"]) {
    assert.equal(await app.fetchRequest(path), undefined);
  }
  assert.equal(await app.fetchRequest("/_nuxt/app.js", { method: "POST" }), undefined);
  assert.equal(await app.fetchRequest("/asset", { url: "https://external.test/image.png" }), undefined);
  assert.deepEqual(app.writes, []);
});

test("navigation never saves a private page, and offline navigation uses the offline screen", async () => {
  const online = worker();
  assert.equal(await (await online.fetchRequest("/projects", { mode: "navigate" })).text(), "network");
  assert.deepEqual(online.writes, []);
  const offline = worker({ offline: true });
  assert.equal(await (await offline.fetchRequest("/projects", { mode: "navigate" })).text(), "offline");
});

test("public assets survive offline and cache quota errors do not break network responses", async () => {
  const online = worker();
  await online.fetchRequest("/_nuxt/app.js", { destination: "script" });
  assert.deepEqual(online.writes, ["https://pxm.test/_nuxt/app.js"]);
  const full = worker({ storageFull: true });
  assert.equal(await (await full.fetchRequest("/_nuxt/app.js", { destination: "script" })).text(), "network");
  const offline = worker({ offline: true });
  assert.equal(await (await offline.fetchRequest("/_nuxt/app.js", { destination: "script" })).text(), "asset");
});

test("activation only removes previous PXM caches", async () => {
  const app = worker();
  let done;
  app.handlers.activate({ waitUntil: (result) => { done = result; } });
  await done;
  assert.deepEqual(app.deleted, ["pxm-cache-old"]);
});

test("private and no-store responses are never persisted", async () => {
  for (const value of ["private, max-age=0", "no-store"]) {
    const app = worker({ headers: { "Cache-Control": value } });
    assert.equal(await (await app.fetchRequest("/_nuxt/app.js", { destination: "script" })).text(), "network");
    assert.deepEqual(app.writes, []);
  }
});

test("each build stamps its own cache version and rejects invalid metadata", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxm-pwa-test-"));
  try {
    mkdirSync(join(dir, "_nuxt/builds"), { recursive: true });
    for (const id of ["build-one", "build-two"]) {
      writeFileSync(join(dir, "_nuxt/builds/latest.json"), JSON.stringify({ id }));
      writeFileSync(join(dir, "sw.js"), source);
      stampServiceWorker(dir);
      const stamped = readFileSync(join(dir, "sw.js"), "utf8");
      assert.ok(stamped.includes(`pxm-cache-${id}`));
      assert.ok(!stamped.includes("__PXM_BUILD_ID__"));
    }
    writeFileSync(join(dir, "_nuxt/builds/latest.json"), JSON.stringify({ id: "../invalid" }));
    assert.throws(() => stampServiceWorker(dir), /invalid or missing build ID/);
  } finally {
    assert.equal(dirname(dir), resolve(tmpdir()));
    rmSync(dir, { recursive: true, force: true });
  }
});
