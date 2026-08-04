import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  FptTtsService,
  normalizeTtsText,
  normalizeTtsVoice,
  padTtsText,
  splitTtsText,
  ttsCacheKey,
  TtsError,
} from "../../server/tts.js";

async function waitForTerminal(
  service: FptTtsService,
  requestId: string,
): Promise<Awaited<ReturnType<FptTtsService["status"]>>> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await service.status(requestId);
    if (result.status !== "pending") return result;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  throw new Error("TTS job did not finish in time");
}

test("normalizes voices and pads FPT's short-text minimum", () => {
  assert.equal(normalizeTtsText("  má  "), "má");
  assert.equal(normalizeTtsVoice("giahuy"), "giahuy");
  assert.equal(padTtsText("ở").length, 3);
  assert.throws(
    () => normalizeTtsText(""),
    (error: unknown) => error instanceof TtsError && error.code === "INVALID_TEXT",
  );
  assert.throws(
    () => normalizeTtsVoice("north"),
    (error: unknown) => error instanceof TtsError && error.code === "INVALID_VOICE",
  );
});

test("splits long text at a word boundary and hashes voice and speed", () => {
  const text = "một câu tiếng Việt rất dài ".repeat(300).trim();
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
  const fetcher = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), init });
    if (String(url) === "https://api.fpt.ai/hmi/tts/v5") {
      const headers = init?.headers as Record<string, string>;
      assert.equal(headers.api_key, "test-secret-key");
      assert.equal(headers.voice, "giahuy");
      assert.equal(headers.speed, "-1");
      return new Response(JSON.stringify({ error: 0, async: "https://audio.fpt.ai/test.mp3" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "audio/mpeg" },
    });
  };
  try {
    const service = new FptTtsService(keyFile, path.join(root, "cache"), -1, {
      fetcher,
      pollRetryMs: 1,
      pollTimeoutMs: 50,
    });
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

test("retries a failed job after its backoff expires", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "tim-con-heo-tts-"));
  const keyFile = path.join(root, "fpt.key");
  await writeFile(keyFile, "test-secret-key");
  let posts = 0;
  const fetcher = async (url: RequestInfo | URL): Promise<Response> => {
    if (String(url).includes("api.fpt.ai/hmi/tts")) {
      posts += 1;
      if (posts === 1) return new Response(null, { status: 429 });
      return new Response(JSON.stringify({ error: 0, async: "https://audio.fpt.ai/retry.mp3" }), {
        status: 200,
      });
    }
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "audio/mpeg" },
    });
  };
  try {
    const service = new FptTtsService(keyFile, path.join(root, "cache"), -1, {
      fetcher,
      failedRetryMs: 0,
      pollRetryMs: 1,
    });
    const first = await service.request("retry me", "myan");
    assert.equal(first.status, "pending");
    const failed = await waitForTerminal(service, first.status === "pending" ? first.requestId : "");
    assert.equal(failed.status, "failed");

    const retry = await service.request("retry me", "myan");
    assert.equal(retry.status, "pending");
    const ready = await waitForTerminal(service, retry.status === "pending" ? retry.requestId : "");
    assert.equal(ready.status, "ready");
    assert.equal(posts, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("limits concurrent provider work and rejects an overflowing pending queue", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "tim-con-heo-tts-"));
  const keyFile = path.join(root, "fpt.key");
  await writeFile(keyFile, "test-secret-key");
  let posts = 0;
  let releaseFirst: (() => void) | undefined;
  const firstAudio = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const fetcher = async (url: RequestInfo | URL): Promise<Response> => {
    if (String(url).includes("api.fpt.ai/hmi/tts")) {
      posts += 1;
      return new Response(JSON.stringify({ error: 0, async: `https://audio.fpt.ai/${posts}.mp3` }), {
        status: 200,
      });
    }
    if (String(url).endsWith("/1.mp3")) await firstAudio;
    return new Response(new Uint8Array([1]), { status: 200, headers: { "content-type": "audio/mpeg" } });
  };
  try {
    const service = new FptTtsService(keyFile, path.join(root, "cache"), -1, {
      fetcher,
      maxConcurrent: 1,
      maxPending: 2,
      pollRetryMs: 1,
    });
    const first = await service.request("first request", "myan");
    const second = await service.request("second request", "myan");
    assert.equal(first.status, "pending");
    assert.equal(second.status, "pending");
    await assert.rejects(
      () => service.request("overflow request", "myan"),
      (error: unknown) => error instanceof TtsError && error.code === "TTS_BUSY",
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(posts, 1);
    releaseFirst?.();
    await waitForTerminal(service, first.status === "pending" ? first.requestId : "");
    await waitForTerminal(service, second.status === "pending" ? second.requestId : "");
    assert.equal(posts, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("aborts a stalled outbound provider request", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "tim-con-heo-tts-"));
  const keyFile = path.join(root, "fpt.key");
  await writeFile(keyFile, "test-secret-key");
  const fetcher = (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), {
        once: true,
      });
    });
  try {
    const service = new FptTtsService(keyFile, path.join(root, "cache"), -1, {
      fetcher,
      requestTimeoutMs: 5,
      pollRetryMs: 1,
    });
    const pending = await service.request("timeout request", "myan");
    assert.equal(pending.status, "pending");
    const failed = await waitForTerminal(service, pending.status === "pending" ? pending.requestId : "");
    assert.equal(failed.status, "failed");
    if (failed.status === "failed") assert.equal(failed.error.code, "FPT_UNAVAILABLE");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("prunes expired cache files, enforces the size cap, and touches served audio", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "tim-con-heo-tts-"));
  const cacheDir = path.join(root, "cache");
  const keyFile = path.join(root, "fpt.key");
  await mkdir(cacheDir);
  await writeFile(keyFile, "test-secret-key");
  const expiredId = "a".repeat(64);
  const expiredPath = path.join(cacheDir, `${expiredId}.mp3`);
  await writeFile(expiredPath, new Uint8Array([1]));
  await utimes(expiredPath, new Date(0), new Date(0));
  const fetcher = async (url: RequestInfo | URL): Promise<Response> =>
    String(url).includes("api.fpt.ai/hmi/tts")
      ? new Response(JSON.stringify({ error: 0, async: `https://audio.fpt.ai/${Date.now()}.mp3` }), {
          status: 200,
        })
      : new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "audio/mpeg" } });
  try {
    const service = new FptTtsService(keyFile, cacheDir, -1, {
      fetcher,
      cacheTtlMs: 10,
      maxCacheBytes: 4,
      pollRetryMs: 1,
    });
    await assert.rejects(
      () => service.audio(expiredId),
      (error: unknown) => error instanceof TtsError && error.code === "AUDIO_NOT_READY",
    );
    for (const text of ["cache one", "cache two"]) {
      const pending = await service.request(text, "myan");
      assert.equal(pending.status, "pending");
      await waitForTerminal(service, pending.status === "pending" ? pending.requestId : "");
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    const files = (await readdir(cacheDir)).filter((name) => name.endsWith(".mp3"));
    assert.equal(files.length, 1);
    const filePath = path.join(cacheDir, files[0]);
    const before = (await stat(filePath)).mtimeMs;
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.audio(files[0].slice(0, -4));
    assert.ok((await stat(filePath)).mtimeMs > before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
