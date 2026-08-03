export function finishSpeechIfCurrent(token: number, current: number, onEnd?: () => void): void {
  if (token === current) onEnd?.();
}
