import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The app is always served from /heo -- by Express behind the IIS reverse proxy
// on the web, and from https://ayrien.se/heo/ inside the Android WebView.
export default defineConfig({
  base: "/heo/",
  plugins: [react()],
  css: { transformer: "lightningcss" },
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
