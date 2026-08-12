import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "android/**",
    "dist/**",
    "coverage/**",
    ".codex-transfer/**",
    "corpus/local/**",
  ]),

  // Plain scripts (build helpers, service worker) get the baseline rules only.
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.serviceworker },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },

  // Type-aware linting for everything we actually ship.
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        // projectService picks tsconfig.client.json, tsconfig.server.json or
        // tsconfig.tests.json per file, which is what makes the type-aware rules
        // work across all three halves.
        projectService: {
          // Build configuration is not in any of those projects, so it gets an
          // inferred one rather than a parse error.
          allowDefaultProject: [
            "vite.config.ts",
            "vitest.config.ts",
            "capacitor.config.ts",
            "playwright.config.ts",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "unused-imports": unusedImports },
    rules: {
      // unused-imports owns unused code so it can auto-remove dead imports.
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
    },
  },

  // Client components additionally get the Rules of Hooks.
  {
    files: ["app/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // Tests legitimately poke at loose shapes, and build helpers are scripts.
  {
    files: ["tests/**/*.{ts,tsx}", "scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },

  // node:test returns a promise from every `test()` call and handles it itself,
  // so the floating-promise rule fires on every single test in the file. The
  // fetch doubles are deliberately synchronous and deliberately stringify a
  // union that includes Request.
  {
    files: ["tests/server/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-base-to-string": "off",
    },
  },
  // Express exposes request bodies as any at the HTTP boundary. They are
  // immediately passed through the runtime validators in server/server.ts;
  // unsafe member access here would report the framework type rather than the
  // actual validation contract.
  {
    files: ["server/server.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },

  // node:sqlite currently types row JSON values as any. The database adapter
  // parses those values into the application's bounded record types at this
  // boundary.
  {
    files: ["server/database.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },

  // These conversions are deliberately guarded by the corresponding runtime
  // validators; the rule cannot distinguish them from object stringification.
  {
    files: ["server/auth.ts", "server/scheduler.ts", "shared/validation.ts"],
    rules: {
      "@typescript-eslint/no-base-to-string": "off",
    },
  },

  // Vite's plugin factory types are loaded outside the project-service graph.
  {
    files: ["vite.config.ts", "vitest.config.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-call": "off",
    },
  },

  {
    files: ["tests/client/speech.test.tsx"],
    rules: {
      "@typescript-eslint/require-await": "off",
    },
  },
]);
