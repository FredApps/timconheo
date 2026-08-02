import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The app is always served from /heo -- by Express behind the IIS reverse proxy
// on the web, and from https://ayrien.se/heo/ inside the Android WebView. Keeping
// the base fixed means one build artifact works for both.
export default defineConfig({
  base: "/heo/",
  plugins: [react(), tailwindcss()],
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
