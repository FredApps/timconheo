import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { expect, test } from "vitest";
import { STRINGS } from "../../app/i18n/strings";
import {
  BAND_LABELS,
  ERROR_KEYS,
  KIND_LABELS,
  LICENSE_LABELS,
  POS_LABELS,
  REGION_LABELS,
  STATUS_KEYS,
  errorKey,
} from "../../app/i18n/content";

const ROOT = resolve(__dirname, "../..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("every catalog entry has both languages and neither is empty", () => {
  for (const [key, value] of Object.entries(STRINGS)) {
    expect(value.en, `${key} is missing English`).toBeTypeOf("string");
    expect(value.vi, `${key} is missing Vietnamese`).toBeTypeOf("string");
    expect(value.en.trim(), `${key} has an empty English string`).not.toBe("");
    expect(value.vi.trim(), `${key} has an empty Vietnamese string`).not.toBe("");
  }
});

test("a template slot declared in one language is declared in the other", () => {
  const slots = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [key, value] of Object.entries(STRINGS)) {
    expect(slots(value.vi), `${key} slots differ between languages`).toEqual(slots(value.en));
  }
});

test("every content label table covers both languages", () => {
  const tables = { POS_LABELS, KIND_LABELS, REGION_LABELS, LICENSE_LABELS, BAND_LABELS };
  for (const [name, table] of Object.entries(tables)) {
    for (const [key, pair] of Object.entries(table)) {
      expect(pair.en.trim(), `${name}.${key} is missing English`).not.toBe("");
      expect(pair.vi.trim(), `${name}.${key} is missing Vietnamese`).not.toBe("");
    }
  }
});

test("every key referenced from a label table exists in the catalog", () => {
  for (const key of [...Object.values(STATUS_KEYS), ...Object.values(ERROR_KEYS)]) {
    expect(STRINGS, `${key} is not in the catalog`).toHaveProperty(key);
  }
});

test("an unmapped server error code falls back to a translated message", () => {
  expect(errorKey("NOT_A_REAL_CODE")).toBe("error.UNKNOWN");
  expect(errorKey(undefined)).toBe("error.UNKNOWN");
  expect(errorKey("INVALID_CREDENTIALS")).toBe("error.INVALID_CREDENTIALS");
});

/**
 * The English-primary guarantee, enforced rather than promised.
 *
 * Any Vietnamese that reaches the screen must come from the catalog or from the
 * content data; a diacritic hard-coded in a component is Vietnamese the language
 * setting cannot turn off.
 */
test("no interface component hard-codes Vietnamese prose", () => {
  const vietnamese = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
  const allowed = new Set([
    // The hỏi/ngã demonstration is about these two spellings specifically; they
    // are content, and there is nowhere more honest to put them.
    resolve(ROOT, "app/views/TonesView.tsx"),
    // Matches Central-labelled device voice names, which are Vietnamese strings
    // by nature. Nothing here reaches the screen.
    resolve(ROOT, "app/lib/speech.tsx"),
  ]);

  // Comments are for the people maintaining this and may discuss Vietnamese
  // freely; only what can reach the screen is in scope.
  const stripComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  // Scoped to what renders. Libraries legitimately hold Vietnamese as data --
  // clause-linker word lists, compound tables, the fallback description on an
  // imported text -- and none of that is an untranslatable label.
  const surfaces = [
    resolve(ROOT, "app/views"),
    resolve(ROOT, "app/components"),
    resolve(ROOT, "app/App.tsx"),
    resolve(ROOT, "app/Root.tsx"),
    resolve(ROOT, "app/LoginView.tsx"),
  ];

  const offenders: string[] = [];
  const files = surfaces.flatMap((path) => (statSync(path).isDirectory() ? walk(path) : [path]));
  for (const file of files) {
    if (!/\.tsx?$/.test(file)) continue;
    if (allowed.has(file)) continue;
    if (vietnamese.test(stripComments(readFileSync(file, "utf8")))) offenders.push(relative(ROOT, file));
  }
  expect(offenders).toEqual([]);
});
