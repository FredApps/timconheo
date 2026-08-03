import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FptTtsService, normalizeTtsText, normalizeTtsVoice, padTtsText, splitTtsText, ttsCacheKey, TtsError } from "../server/tts.js";

test("normalizes voices and pads FPT's short-text minimum", () => {
  assert.equal(normalizeTtsText("  má  "), "má");
  assert.equal(normalizeTtsVoice("giahuy"), "giahuy");
  assert.equal(padTtsText("ở").length, 3);
  assert.throws(() => normalizeTtsText(""), (error: unknown) => error instanceof TtsError && error.code === "INVALID_TEXT");
  assert.throws(() => normalizeTtsVoice("north"), (error: unknown) => error instanceof TtsError && error.code === "INVALID_VOICE");
});

test("splits long text at a word boundary and hashes voice and speed", () => {
  const text = ("một câu tiếng Việt rất dài ".repeat(300)).trim();
  const parts = splitTtsText(text);
  assert.ok(parts.length > 1);
  assert.ok(parts.every((part) => part.length <= 4500));
  assert.equal(ttsCacheKey("má", "myan", -1), ttsCacheKey("má", "myan", -1));
  assert.notEqual(ttsCacheKey("má", "myan", -1), ttsCacheKey("má", "giahuy", -1));
});

test("coalesces async FPT jobs and serves the cached result", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "tim-con-heo-tts-"));
  const keyFile = path.join(root, "fpt.key");
  await writeFile(keyFile, "test-secret-key");
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = async (url: string | URL, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), init });
    if (String(url) === "https://api.fpt.ai/hmi/tts/v5") {
      const headers = init?.headers as Record<string, string>;
      assert.equal(headers.api_key, "test-secret-key");
      assert.equal(headers.voice, "giahuy");
      assert.equal(headers.speed, "-1");
      return new Response(JSON.stringify({ error: 0, async: "https://audio.fpt.ai/test.mp3" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "audio/mpeg" } });
  };
  try {
    const service = new FptTtsService(keyFile, path.join(root, "cache"), -1, { fetcher, pollRetryMs: 1, pollTimeoutMs: 50 });
    const first = await service.request("má", "giahuy");
    const second = await service.request("má", "giahuy");
    assert.equal(first.status, "pending");
    assert.deepEqual(second, first);
    const requestId = first.status === "pending" ? first.requestId : "";
    for (let i = 0; i < 20; i += 1) {
      const status = await service.status(requestId);
      if (status.status === "ready") break;
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    const ready = await service.status(requestId);
    assert.equal(ready.status, "ready");
    const postCount = calls.filter((call) => call.url === "https://api.fpt.ai/hmi/tts/v5").length;
    assert.equal(postCount, 1);
    const cached = await service.request("má", "giahuy");
    assert.equal(cached.status, "ready");
    assert.equal(calls.filter((call) => call.url === "https://api.fpt.ai/hmi/tts/v5").length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("does not expose a missing key as a provider error", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "tim-con-heo-tts-"));
  try {
    const service = new FptTtsService(path.join(root, "missing.key"), path.join(root, "cache"), -1);
    const pending = await service.request("má", "myan");
    assert.equal(pending.status, "pending");
    const requestId = pending.status === "pending" ? pending.requestId : "";
    await new Promise((resolve) => setTimeout(resolve, 5));
    const failed = await service.status(requestId);
    assert.equal(failed.status, "failed");
    if (failed.status === "failed") {
      assert.equal(failed.error.code, "FPT_NOT_CONFIGURED");
      assert.doesNotMatch(failed.error.message, /key|secret/i);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
