import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("export", Date.now().toString());
const { default: worker } = await import(workerUrl.href);

// The shell is always rendered at "/". vinext 0.0.50 does not honour Next's
// `basePath` -- building with it set makes the worker 404 on every path -- so
// instead of relying on it we emit root-relative URLs below. One artifact then
// works unchanged under IIS at /heo/ and at the Capacitor WebView root.
const response = await worker.fetch(
  new Request("http://localhost/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) {
  throw new Error(`Static export failed with HTTP ${response.status}`);
}

let html = await response.text();

// Absolute "/assets/..." would resolve to the server root and 404 under /heo/.
// The app routes purely on the hash, so the document URL is always the deploy
// directory itself and "./" is unambiguous.
html = html.replace(/(src|href)="\/assets\//g, '$1="./assets/');

// Same for the app manifest: absolute https://ayrien.se/heo/... breaks the
// Android build, which has no network guarantee and a different origin.
html = html.replace(/href="https:\/\/ayrien\.se\/heo\/manifest\.webmanifest"/g, 'href="./manifest.webmanifest"');

const remainingAbsolute = html.match(/(?:src|href)="\/(?!\/)[^"]*"/g);
if (remainingAbsolute) {
  throw new Error(`Static export left server-absolute URLs that break under /heo/: ${remainingAbsolute.join(", ")}`);
}

const outputDirectory = resolve(projectRoot, "dist", "client");
await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, "index.html"), html, "utf8");
console.log("Static app shell exported (path-relative; serves from any directory)");
