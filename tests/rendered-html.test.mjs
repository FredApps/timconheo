import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete Vietnamese reading home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="vi"/i);
  assert.match(html, /<title>Tìm Con Heo/);
  assert.match(html, /Chào bạn, đọc một chút/);
  assert.match(html, /Không mục tiêu mỗi ngày/);
  assert.match(html, /Con cò bé bé/);
  assert.match(html, /Dung dăng dung dẻ/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("ships the reader, tone, local data, and offline foundations", async () => {
  const [app, database, pitch, manifest, serviceWorker, packageJson] = await Promise.all([
    readFile(new URL("../app/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/database.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/pitch.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(app, /Đầy đủ/);
  assert.match(app, /Ghi âm/);
  assert.match(app, /Không tải lên máy chủ/);
  assert.match(database, /timconheo/);
  assert.match(database, /scheduler\.next/);
  assert.match(pitch, /detectPitch/);
  assert.equal(JSON.parse(manifest).lang, "vi");
  assert.match(serviceWorker, /caches\.open/);
  assert.match(packageJson, /"dexie"/);
  assert.match(packageJson, /"ts-fsrs"/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  await access(projectRoot);
});
