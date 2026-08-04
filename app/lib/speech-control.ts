// Pure helpers for the speech state machine. Kept out of speech.tsx so the
// timing rules can be tested without a DOM, an audio element, or a network.

export type SpeechPhase = "idle" | "generating" | "playing" | "fallback" | "error";
export type SpeechProvider = "fpt" | "device";

/** How long the learner waits before we offer them the device voice manually. */
export const OFFER_DEVICE_AFTER_MS = 5000;
/** How long before we stop waiting on FPT and switch for them. */
export const FALLBACK_AFTER_MS = 12000;

export interface SpeechState {
  phase: SpeechPhase;
  provider: SpeechProvider;
  /** True once the learner has waited long enough to be offered the device voice. */
  canUseDeviceNow: boolean;
  /** Set when the last attempt failed outright rather than falling back. */
  error: string | null;
}

export const IDLE_STATE: SpeechState = {
  phase: "idle",
  provider: "fpt",
  canUseDeviceNow: false,
  error: null,
};

export class SpeechCancelled extends Error {
  constructor() {
    super("Speech cancelled.");
    this.name = "SpeechCancelled";
  }
}

export function isSpeechCancelled(error: unknown): boolean {
  return error instanceof SpeechCancelled || (error instanceof DOMException && error.name === "AbortError");
}

/**
 * Errors the server has already decided about. Waiting out the twelve-second
 * timer after the server said "quota exhausted" only makes the app feel broken,
 * so these switch to the device voice immediately.
 */
const TERMINAL_CODES = new Set([
  "FPT_QUOTA",
  "FPT_NOT_CONFIGURED",
  "FPT_REJECTED",
  "FPT_BAD_RESPONSE",
  "FPT_BAD_URL",
  "FPT_REQUEST_FAILED",
  "FPT_UNAVAILABLE",
  "FPT_TIMEOUT",
  "TTS_BUSY",
  "RATE_LIMITED",
  "INVALID_VOICE",
  "UNKNOWN_TTS_REQUEST",
]);

export function isTerminalSpeechError(code: string | undefined, status?: number): boolean {
  if (code && TERMINAL_CODES.has(code)) return true;
  // Any error status is the server having already decided; there is nothing left
  // to wait for. 202 (pending) and 200 never reach here.
  return typeof status === "number" && status >= 400;
}

/**
 * Guard for the callback-style completion path used by the native text-to-speech
 * plugin, which has no abort signal of its own.
 */
export function finishSpeechIfCurrent(token: number, current: number, onEnd?: () => void): void {
  if (token === current) onEnd?.();
}
