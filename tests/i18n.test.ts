import test from "node:test";
import assert from "node:assert/strict";
import { STRINGS } from "../app/i18n/strings";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("English and Vietnamese catalogs have identical keys", () => {
  for (const [key, value] of Object.entries(STRINGS)) {
    assert.equal(typeof value.en, "string", `${key} is missing English`);
    assert.equal(typeof value.vi, "string", `${key} is missing Vietnamese`);
  }
});

test("English-primary UI source contains no Vietnamese prose", () => {
  const files = [
    "app/App.tsx",
    "app/LoginView.tsx",
    "app/components/ui.tsx",
    "app/views/index.tsx",
    "app/views/WordsView.tsx",
    "app/views/GardenView.tsx",
    "app/views/ImportView.tsx",
    "app/views/AboutView.tsx",
    "app/views/TonesView.tsx",
    "app/views/ReviewView.tsx",
  ];
  const vietnamese = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
  for (const file of files) {
    const source = readFileSync(resolve(file), "utf8")
      .replaceAll("mả", "")
      .replaceAll("mã", "");
    assert.equal(vietnamese.test(source), false, `${file} contains Vietnamese UI prose`);
  }
});
