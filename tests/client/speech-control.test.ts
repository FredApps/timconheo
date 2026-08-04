import { expect, test } from "vitest";
import {
  FALLBACK_AFTER_MS,
  OFFER_DEVICE_AFTER_MS,
  SpeechCancelled,
  finishSpeechIfCurrent,
  isSpeechCancelled,
  isTerminalSpeechError,
} from "../../app/lib/speech-control";

test("the manual offer comes before the automatic fallback", () => {
  expect(OFFER_DEVICE_AFTER_MS).toBeLessThan(FALLBACK_AFTER_MS);
  expect(OFFER_DEVICE_AFTER_MS).toBe(5000);
  expect(FALLBACK_AFTER_MS).toBe(12000);
});

test("cancellation is recognised however it was raised", () => {
  expect(isSpeechCancelled(new SpeechCancelled())).toBe(true);
  expect(isSpeechCancelled(new DOMException("stop", "AbortError"))).toBe(true);
  expect(isSpeechCancelled(new Error("network"))).toBe(false);
  expect(isSpeechCancelled(undefined)).toBe(false);
});

test("a decision the server already made falls back immediately", () => {
  // Quota exhausted, no key configured, or busy: waiting out twelve seconds
  // after any of these only makes the app feel broken.
  expect(isTerminalSpeechError("FPT_QUOTA")).toBe(true);
  expect(isTerminalSpeechError("FPT_NOT_CONFIGURED")).toBe(true);
  expect(isTerminalSpeechError("TTS_BUSY")).toBe(true);
  expect(isTerminalSpeechError("RATE_LIMITED")).toBe(true);
  expect(isTerminalSpeechError(undefined, 503)).toBe(true);
  expect(isTerminalSpeechError(undefined, 500)).toBe(true);
  expect(isTerminalSpeechError(undefined, 404)).toBe(true);
});

test("a request still in flight is not treated as terminal", () => {
  expect(isTerminalSpeechError(undefined, undefined)).toBe(false);
  expect(isTerminalSpeechError("SOMETHING_NEW")).toBe(false);
  expect(isTerminalSpeechError(undefined, 202)).toBe(false);
});

test("native completion ignores a cancelled generation", () => {
  let completions = 0;
  finishSpeechIfCurrent(1, 2, () => (completions += 1));
  expect(completions).toBe(0);
  finishSpeechIfCurrent(2, 2, () => (completions += 1));
  expect(completions).toBe(1);
});
