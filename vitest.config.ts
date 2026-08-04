import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vitest probes for `jsdom` by walking parent directories for a package.json.
// On a machine with a malformed one above the checkout that probe throws and
// reports a missing dependency that is in fact installed -- the environment
// itself loads correctly either way. Skipping the probe removes a false alarm,
// not a real check: a genuinely missing jsdom still fails at environment setup.
process.env.VITEST_SKIP_INSTALL_CHECKS ??= "1";

// Client-side tests only. Server tests run under `node --test` because the
// server talks to node:sqlite and the real filesystem, which jsdom has no
// business being in the middle of.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

export default defineConfig({
  plugins: [react()],
  // Mirrors vite.config.ts so the About page renders under test too.
  define: { __APP_VERSION__: JSON.stringify(version) },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/client/setup.ts"],
    include: ["tests/client/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
