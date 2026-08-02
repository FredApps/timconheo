import { Capacitor } from "@capacitor/core";
export function speakVietnamese(text: string, onEnd?: () => void) {
  if (Capacitor.isNativePlatform()) { void import("@capacitor-community/text-to-speech").then(async ({ TextToSpeech }) => { await TextToSpeech.stop(); await TextToSpeech.speak({ text, lang: "vi-VN", rate: 0.82, pitch: 1, volume: 1 }); onEnd?.(); }).catch(() => onEnd?.()); return; }
  if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "vi-VN"; utterance.rate = 0.82; utterance.onend = () => onEnd?.(); const voices = window.speechSynthesis.getVoices(); utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("vi")) ?? null; window.speechSynthesis.speak(utterance);
}
export function stopVietnamese() { window.speechSynthesis?.cancel(); if (Capacitor.isNativePlatform()) void import("@capacitor-community/text-to-speech").then(({ TextToSpeech }) => TextToSpeech.stop()).catch(() => undefined); }

