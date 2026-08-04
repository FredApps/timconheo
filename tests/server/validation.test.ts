import assert from "node:assert/strict";
import test from "node:test";
import {
  LIMITS,
  ValidationError,
  validateCompletedAt,
  validateEntry,
  validateGloss,
  validateImport,
  validateMinutes,
  validateRowId,
  validateScore,
  validateSentenceIds,
  validateToneKey,
  validateWordStatus,
} from "../../shared/validation.js";

function rejects(fn: () => unknown, code: string): void {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof ValidationError, `expected ValidationError, got ${String(error)}`);
    assert.equal(error.code, code);
    assert.equal(error.status, 400);
    return true;
  });
}

test("entries are trimmed, NFC-normalised and bounded", () => {
  assert.equal(validateEntry("  hỏi  "), "hỏi");
  // Decomposed input must land on the same key as composed input, or a word
  // typed on one keyboard silently misses every lookup made from another.
  assert.equal(validateEntry("hỏi".normalize("NFD")), "hỏi");
  rejects(() => validateEntry("   "), "INVALID_ENTRY");
  rejects(() => validateEntry(42), "INVALID_ENTRY");
  rejects(() => validateEntry("x".repeat(LIMITS.entry + 1)), "INVALID_ENTRY");
});

test("optional text accepts absence but not overflow", () => {
  assert.equal(validateGloss(undefined), "");
  assert.equal(validateGloss(null), "");
  assert.equal(validateGloss(" to ask "), "to ask");
  rejects(() => validateGloss("x".repeat(LIMITS.gloss + 1)), "INVALID_GLOSS");
});

test("enumerations reject anything not in the list", () => {
  assert.equal(validateWordStatus("known"), "known");
  assert.equal(validateToneKey("hoi-nga"), "hoi-nga");
  rejects(() => validateWordStatus("mastered"), "INVALID_STATUS");
  rejects(() => validateToneKey("hoi"), "INVALID_TONE");
});

test("scores are bounded and reject non-finite input", () => {
  assert.equal(validateScore(0.5), 0.5);
  assert.equal(validateScore("1"), 1);
  rejects(() => validateScore(1.5), "INVALID_SCORE");
  rejects(() => validateScore(Number.NaN), "INVALID_SCORE");
  rejects(() => validateScore(Number.POSITIVE_INFINITY), "INVALID_SCORE");
});

test("row ids must be positive whole numbers", () => {
  assert.equal(validateRowId("12"), 12);
  rejects(() => validateRowId("12.5"), "INVALID_ID");
  rejects(() => validateRowId("abc"), "INVALID_ID");
  rejects(() => validateRowId(0), "INVALID_ID");
  rejects(() => validateRowId(-3), "INVALID_ID");
});

test("minutes clamp into the session range instead of failing", () => {
  assert.equal(validateMinutes(undefined), 5);
  assert.equal(validateMinutes("10"), 10);
  assert.equal(validateMinutes(9999), LIMITS.minutes.max);
  assert.equal(validateMinutes(-4), LIMITS.minutes.min);
  rejects(() => validateMinutes("soon"), "INVALID_MINUTES");
});

test("progress arrays are bounded and de-duplicated", () => {
  assert.deepEqual(validateSentenceIds(["a", "b", "a"]), ["a", "b"]);
  assert.deepEqual(validateSentenceIds(undefined), []);
  rejects(() => validateSentenceIds("a"), "INVALID_PROGRESS");
  rejects(
    () => validateSentenceIds(Array.from({ length: LIMITS.progressSentences + 1 }, (_, i) => `s${i}`)),
    "INVALID_PROGRESS",
  );
});

test("completion time is either absent or a real timestamp", () => {
  assert.equal(validateCompletedAt(null), null);
  assert.equal(validateCompletedAt(0), null);
  assert.equal(validateCompletedAt(1700000000000), 1700000000000);
  rejects(() => validateCompletedAt("later"), "INVALID_PROGRESS");
});

test("imports enforce the limits the form promises", () => {
  const result = validateImport({ title: "  Sông Hàn  ", raw: " Buổi sáng. ", difficulty: 3 });
  assert.deepEqual(result, { title: "Sông Hàn", raw: "Buổi sáng.", difficulty: 3 });
  assert.equal(validateImport({ raw: "x" }).title, "My Vietnamese text");
  rejects(() => validateImport({ raw: "   " }), "INVALID_IMPORT");
  rejects(() => validateImport({ raw: "x".repeat(LIMITS.importText + 1) }), "INVALID_IMPORT");
  rejects(() => validateImport({ raw: "x", title: "t".repeat(LIMITS.importTitle + 1) }), "INVALID_IMPORT");
});
