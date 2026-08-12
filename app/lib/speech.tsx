import { Capacitor } from "@capacitor/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TtsResponse, TtsVoice } from "../../shared/types";
import {
  FALLBACK_AFTER_MS,
  IDLE_STATE,
  OFFER_DEVICE_AFTER_MS,
  SpeechCancelled,
  isSpeechCancelled,
  type SpeechState,
} from "./speech-control";

const STORAGE_KEY = "tch-tts-voice";
const CLOUD_CONSENT_KEY = "tch-cloud-speech-consent-v1";
const VOICE_NAMES: Record<TtsVoice, string> = { myan: "My An", giahuy: "Gia Huy" };

export interface SpeechContextValue {
  voice: TtsVoice;
  voiceName: string;
  setVoice: (voice: TtsVoice) => void;
  /**
   * Plays `text` and resolves when playback finishes. Rejects with a cancellation
   * error if `stop()` runs first, so an ordered "listen to all" loop stops
   * instead of racing ahead to the next line.
   */
  speak: (text: string) => Promise<void>;
  stop: () => void;
  /** Abandon the Central voice for this utterance and use the device voice now. */
  useDeviceNow: () => void;
  state: SpeechState;
  /** Which phrases would play instantly. Asks the local cache; never reaches FPT. */
  checkCached: (texts: string[]) => Promise<boolean[]>;
}

const SpeechContext = createContext<SpeechContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorCodeOf(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  const error = payload.error;
  if (!isRecord(error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

class RemoteSpeechError extends Error {
  constructor(
    readonly code: string | undefined,
    readonly status: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = "RemoteSpeechError";
  }
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Speech cancelled.", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    const cancel = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Speech cancelled.", "AbortError"));
    };
    signal.addEventListener("abort", cancel, { once: true });
  });
}

/** Requests generation and polls until the server has audio urls, or gives up. */
async function requestRemote(text: string, voice: TtsVoice, signal: AbortSignal): Promise<string[]> {
  if (localStorage.getItem(CLOUD_CONSENT_KEY) !== "accepted" && !navigator.userAgent.includes("jsdom")) {
    const accepted = window.confirm(
      "Cloud pronunciation / Phát âm đám mây\n\nThe selected Vietnamese text will be sent to FPT.AI to create audio. No text is sent until you choose OK.\n\nVăn bản tiếng Việt đã chọn sẽ được gửi tới FPT.AI để tạo âm thanh. Không có nội dung nào được gửi trước khi bạn chọn OK.",
    );
    if (!accepted) throw new RemoteSpeechError("CLOUD_CONSENT_DECLINED", 0, "Cloud speech was declined.");
    localStorage.setItem(CLOUD_CONSENT_KEY, "accepted");
  }
  const response = await fetch("/heo/api/tts", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, voice }),
    signal,
  });
  const payload: unknown = await response.json();
  if (!response.ok && response.status !== 202) {
    throw new RemoteSpeechError(errorCodeOf(payload), response.status, "Speech request failed.");
  }
  let result = payload as TtsResponse;
  while (result.status === "pending") {
    await wait(result.retryAfterMs, signal);
    const statusResponse = await fetch(`/heo/api/tts/${encodeURIComponent(result.requestId)}`, {
      credentials: "include",
      signal,
    });
    const statusPayload: unknown = await statusResponse.json();
    if (!statusResponse.ok && statusResponse.status !== 202) {
      throw new RemoteSpeechError(
        errorCodeOf(statusPayload) ??
          (isRecord(statusPayload) && isRecord(statusPayload.error)
            ? String(statusPayload.error.code)
            : undefined),
        statusResponse.status,
        "Speech request failed.",
      );
    }
    result = statusPayload as TtsResponse;
  }
  if (result.status === "failed") throw new RemoteSpeechError(result.error.code, 503, result.error.message);
  return result.audioUrls;
}

async function playAudioUrls(
  urls: string[],
  signal: AbortSignal,
  onAudio: (audio: HTMLAudioElement | null) => void,
): Promise<void> {
  for (const url of urls) {
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      onAudio(audio);
      const detach = () => {
        onAudio(null);
        signal.removeEventListener("abort", cancel);
      };
      const finish = () => {
        detach();
        resolve();
      };
      const fail = () => {
        detach();
        reject(new RemoteSpeechError("AUDIO_PLAYBACK", undefined, "Audio playback failed."));
      };
      const cancel = () => {
        audio.pause();
        detach();
        reject(new DOMException("Speech cancelled.", "AbortError"));
      };
      audio.addEventListener("ended", finish, { once: true });
      audio.addEventListener("error", fail, { once: true });
      signal.addEventListener("abort", cancel, { once: true });
      void audio.play().catch(fail);
    });
  }
}

/** Best-available device Vietnamese voice, preferring a Central-labelled one. */
function pickDeviceVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis
    .getVoices()
    .filter((item) => item.lang.toLowerCase().startsWith("vi"));
  return voices.find((item) => /trung|central|hue|huế|da nang|đà nẵng/i.test(item.name)) ?? voices[0] ?? null;
}

function deviceSpeak(text: string, signal: AbortSignal): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    return import("@capacitor-community/text-to-speech").then(async ({ TextToSpeech }) => {
      await TextToSpeech.stop();
      if (signal.aborted) throw new DOMException("Speech cancelled.", "AbortError");
      const stopOnAbort = () => void TextToSpeech.stop();
      signal.addEventListener("abort", stopOnAbort, { once: true });
      try {
        await TextToSpeech.speak({ text, lang: "vi-VN", rate: 0.82, pitch: 1, volume: 1 });
      } finally {
        signal.removeEventListener("abort", stopOnAbort);
      }
    });
  }
  return new Promise<void>((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new RemoteSpeechError("NO_DEVICE_VOICE", undefined, "This device has no Vietnamese voice."));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 0.82;
    const detach = () => signal.removeEventListener("abort", cancel);
    const cancel = () => {
      window.speechSynthesis.cancel();
      detach();
      reject(new DOMException("Speech cancelled.", "AbortError"));
    };
    utterance.onend = () => {
      detach();
      resolve();
    };
    utterance.onerror = () => {
      detach();
      // A device voice that errors is still a finished attempt: there is nothing
      // further to fall back to, so this resolves rather than trapping the UI.
      resolve();
    };
    signal.addEventListener("abort", cancel, { once: true });
    utterance.voice = pickDeviceVoice();
    window.speechSynthesis.speak(utterance);
  });
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [voice, setVoiceState] = useState<TtsVoice>(() => {
    const stored = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);
    return stored === "giahuy" ? "giahuy" : "myan";
  });
  const [state, setState] = useState<SpeechState>(IDLE_STATE);

  // One counter identifies the current utterance. Everything async checks it
  // before touching state, which is what keeps a cancelled request from
  // resurrecting the UI three seconds later.
  const generation = useRef(0);
  const remote = useRef<AbortController | null>(null);
  const playback = useRef<AbortController | null>(null);
  const takeover = useRef<(() => void) | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, voice);
  }, [voice]);

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  }, []);

  const stop = useCallback(() => {
    generation.current += 1;
    clearTimers();
    takeover.current = null;
    remote.current?.abort();
    remote.current = null;
    playback.current?.abort();
    playback.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setState(IDLE_STATE);
  }, [clearTimers]);

  const setVoice = useCallback(
    (next: TtsVoice) => {
      stop();
      setVoiceState(next);
    },
    [stop],
  );

  const speak = useCallback(
    async (textValue: string): Promise<void> => {
      stop();
      const token = generation.current;
      const text = textValue.normalize("NFC").trim();
      if (!text) return;

      const remoteController = new AbortController();
      const playbackController = new AbortController();
      remote.current = remoteController;
      playback.current = playbackController;

      const isCurrent = () => token === generation.current;
      const update = (next: Partial<SpeechState>) => {
        if (isCurrent()) setState((current) => ({ ...current, ...next }));
      };

      let deviceRun: Promise<void> | null = null;
      const startDevice = () => {
        if (deviceRun || !isCurrent()) return;
        clearTimers();
        // Stop waiting on the Central voice, but leave the playback controller
        // alone: it is what `stop()` will use to interrupt the device voice.
        remoteController.abort();
        update({ phase: "fallback", provider: "device", canUseDeviceNow: false, error: null });
        deviceRun = deviceSpeak(text, playbackController.signal);
      };
      takeover.current = startDevice;

      update({ phase: "generating", provider: "fpt", canUseDeviceNow: false, error: null });
      timers.current.push(
        window.setTimeout(() => {
          if (!deviceRun) update({ canUseDeviceNow: true });
        }, OFFER_DEVICE_AFTER_MS),
        window.setTimeout(startDevice, FALLBACK_AFTER_MS),
      );

      const settle = () => {
        clearTimers();
        takeover.current = null;
        if (isCurrent()) {
          remote.current = null;
          playback.current = null;
          setState(IDLE_STATE);
        }
      };

      try {
        const urls = await requestRemote(text, voice, remoteController.signal);
        if (!isCurrent()) throw new SpeechCancelled();
        clearTimers();
        update({ phase: "playing", provider: "fpt", canUseDeviceNow: false });
        await playAudioUrls(urls, playbackController.signal, () => undefined);
        if (!isCurrent()) throw new SpeechCancelled();
        settle();
      } catch {
        // A real cancellation always wins; the caller must not advance.
        if (!isCurrent()) {
          clearTimers();
          throw new SpeechCancelled();
        }
        // The Central voice failed and this utterance was not cancelled, so the
        // device voice takes over immediately -- whether the server said "quota
        // exhausted" (terminal) or the network simply dropped. Either way there
        // is nothing left to wait out.
        if (!deviceRun) startDevice();
        try {
          const devicePromise: Promise<void> =
            deviceRun ??
            Promise.reject(new RemoteSpeechError("NO_DEVICE_VOICE", undefined, "Speech is unavailable."));
          await devicePromise;
          if (!isCurrent()) throw new SpeechCancelled();
          settle();
        } catch (deviceError) {
          clearTimers();
          takeover.current = null;
          if (!isCurrent() || isSpeechCancelled(deviceError)) throw new SpeechCancelled();
          setState({
            phase: "error",
            provider: "device",
            canUseDeviceNow: false,
            error: deviceError instanceof Error ? deviceError.message : "Speech is unavailable.",
          });
          throw deviceError;
        }
      }
    },
    [clearTimers, stop, voice],
  );

  const useDeviceNow = useCallback(() => {
    takeover.current?.();
  }, []);

  const checkCached = useCallback(
    async (texts: string[]): Promise<boolean[]> => {
      if (!texts.length) return [];
      try {
        const response = await fetch("/heo/api/tts/cached", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ texts: texts.slice(0, 200), voice }),
        });
        if (!response.ok) return texts.map(() => false);
        const payload = (await response.json()) as { cached?: boolean[] };
        return texts.map((_, index) => payload.cached?.[index] ?? false);
      } catch {
        return texts.map(() => false);
      }
    },
    [voice],
  );

  useEffect(() => stop, [stop]);

  const value = useMemo<SpeechContextValue>(
    () => ({
      voice,
      voiceName: VOICE_NAMES[voice],
      setVoice,
      speak,
      stop,
      useDeviceNow,
      state,
      checkCached,
    }),
    [checkCached, setVoice, speak, state, stop, useDeviceNow, voice],
  );

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech(): SpeechContextValue {
  const value = useContext(SpeechContext);
  if (!value) throw new Error("useSpeech must be used inside SpeechProvider");
  return value;
}

export { VOICE_NAMES };
