import { Capacitor } from "@capacitor/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { TtsResponse, TtsVoice } from "../../shared/types";

const STORAGE_KEY = "tch-tts-voice";
const FALLBACK_MESSAGE = "Central voice unavailable — using your device voice.";
const TTS_TIMEOUT_MS = 20000;
const voiceNames: Record<TtsVoice, string> = { myan: "My An", giahuy: "Gia Huy" };

type SpeechContextValue = {
  voice: TtsVoice;
  setVoice: (voice: TtsVoice) => void;
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  notice: string | null;
  dismissNotice: () => void;
  voiceName: string;
};

const SpeechContext = createContext<SpeechContextValue | null>(null);
const abortError = () => new DOMException("Speech cancelled.", "AbortError");

function isAbort(error: unknown): boolean { return error instanceof DOMException && error.name === "AbortError"; }
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { window.clearTimeout(timer); reject(abortError()); }, { once: true });
  });
}

async function requestRemote(text: string, voice: TtsVoice, signal: AbortSignal): Promise<string[]> {
  const response = await fetch("/heo/api/tts", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, voice }), signal });
  const payload = await response.json() as TtsResponse | { error?: { message?: string } };
  if (!response.ok && response.status !== 202) throw new Error(payload && "error" in payload ? payload.error?.message ?? "Speech request failed." : "Speech request failed.");
  let result = payload as TtsResponse;
  while (result.status === "pending") {
    await wait(result.retryAfterMs, signal);
    const statusResponse = await fetch("/heo/api/tts/" + encodeURIComponent(result.requestId), { credentials: "include", signal });
    result = await statusResponse.json() as TtsResponse;
    if (!statusResponse.ok && statusResponse.status !== 202) throw new Error(result.status === "failed" ? result.error.message : "Speech request failed.");
  }
  if (result.status === "failed") throw new Error(result.error.message);
  return result.audioUrls;
}

async function playAudioUrls(urls: string[], signal: AbortSignal, onAudio: (audio: HTMLAudioElement | null) => void): Promise<void> {
  for (const url of urls) {
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url); onAudio(audio);
      const finish = () => { onAudio(null); signal.removeEventListener("abort", cancel); resolve(); };
      const fail = () => { onAudio(null); signal.removeEventListener("abort", cancel); reject(new Error("Audio playback failed.")); };
      const cancel = () => { audio.pause(); onAudio(null); signal.removeEventListener("abort", cancel); reject(abortError()); };
      audio.addEventListener("ended", finish, { once: true });
      audio.addEventListener("error", fail, { once: true });
      signal.addEventListener("abort", cancel, { once: true });
      void audio.play().catch(fail);
    });
  }
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [voice, setVoiceState] = useState<TtsVoice>(() => {
    const stored = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);
    return stored === "giahuy" ? "giahuy" : "myan";
  });
  const [notice, setNotice] = useState<string | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, voice); }, [voice]);
  const setVoice = useCallback((next: TtsVoice) => setVoiceState(next), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const stop = useCallback(() => {
    generation.current += 1;
    controller.current?.abort();
    controller.current = null;
    audio.current?.pause();
    audio.current = null;
    window.speechSynthesis?.cancel();
    if (Capacitor.isNativePlatform()) void import("@capacitor-community/text-to-speech").then(({ TextToSpeech }) => TextToSpeech.stop()).catch(() => undefined);
  }, []);

  const deviceSpeak = useCallback((text: string, onEnd: (() => void) | undefined, token: number) => {
    if (token !== generation.current) return;
    if (Capacitor.isNativePlatform()) {
      void import("@capacitor-community/text-to-speech").then(async ({ TextToSpeech }) => {
        if (token !== generation.current) return;
        await TextToSpeech.stop();
        await TextToSpeech.speak({ text, lang: "vi-VN", rate: 0.82, pitch: 1, volume: 1 });
        if (token === generation.current) onEnd?.();
      }).catch(() => onEnd?.());
      return;
    }
    if (!("speechSynthesis" in window)) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN"; utterance.rate = 0.82;
    utterance.onend = () => { if (token === generation.current) onEnd?.(); };
    utterance.onerror = () => { if (token === generation.current) onEnd?.(); };
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((item) => item.lang.toLowerCase().startsWith("vi")) ?? null;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback((textValue: string, onEnd?: () => void) => {
    stop();
    const token = generation.current;
    const text = textValue.normalize("NFC").trim();
    if (!text) { onEnd?.(); return; }
    const localController = new AbortController();
    controller.current = localController;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; localController.abort(); }, TTS_TIMEOUT_MS);
    void requestRemote(text, voice, localController.signal)
      .then((urls) => playAudioUrls(urls, localController.signal, (player) => { audio.current = player; }))
      .then(() => { if (token === generation.current) { window.clearTimeout(timeout); controller.current = null; setNotice(null); onEnd?.(); } })
      .catch((error: unknown) => {
        window.clearTimeout(timeout);
        if (token !== generation.current || isAbort(error) && !timedOut) return;
        controller.current = null;
        setNotice((current) => current ?? FALLBACK_MESSAGE);
        deviceSpeak(text, onEnd, token);
      });
  }, [deviceSpeak, stop, voice]);

  const value = useMemo(() => ({ voice, setVoice, speak, stop, notice, dismissNotice, voiceName: voiceNames[voice] }), [dismissNotice, notice, setVoice, speak, stop, voice]);
  return <SpeechContext.Provider value={value}>{children}<div role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}>{notice}</div></SpeechContext.Provider>;
}

export function useSpeech(): SpeechContextValue {
  const value = useContext(SpeechContext);
  if (!value) throw new Error("useSpeech must be used inside SpeechProvider");
  return value;
}
