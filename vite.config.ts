import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

// The app is always served from /heo -- by Express behind the IIS reverse proxy
// on the web, and from https://ayrien.se/heo/ inside the Android WebView.
export default defineConfig({
  base: "/heo/",
  plugins: [react()],
  css: { transformer: "lightningcss" },
  define: {
    // One source of truth for the version the About page shows.
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/heo/api": "http://127.0.0.1:3092",
    },
  },
});
