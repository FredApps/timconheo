import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "android/**",
    "dist/**",
    "coverage/**",
  ]),
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "no-constant-condition": "error",
      "no-debugger": "warn",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    },
  },
]);