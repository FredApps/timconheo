import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const basePath = (process.env.BASE_PATH || "").replace(/\/$/, "");
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("export", Date.now().toString());
const { default: worker } = await import(workerUrl.href);

const response = await worker.fetch(
  new Request(`http://localhost${basePath || "/"}`, { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) {
  throw new Error(`Static export failed with HTTP ${response.status}`);
}

const outputDirectory = resolve(projectRoot, "dist", "client");
await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, "index.html"), await response.text(), "utf8");
console.log(`Static app shell exported for ${basePath || "/"}`);
