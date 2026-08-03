import assert from "node:assert/strict";
import test from "node:test";
import { finishSpeechIfCurrent } from "../app/lib/speech-control.js";

test("native fallback completion ignores canceled speech generations", () => {
  let completions = 0;
  finishSpeechIfCurrent(1, 2, () => { completions += 1; });
  assert.equal(completions, 0);

  finishSpeechIfCurrent(2, 2, () => { completions += 1; });
  assert.equal(completions, 1);
});
