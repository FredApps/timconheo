import type { StringKey } from "../i18n/strings";
export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  let rms = 0;
  for (const value of buffer) rms += value * value;
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.012) return null;
  let bestOffset = -1;
  let bestCorrelation = 0;
  for (let offset = 2; offset < buffer.length / 2; offset += 1) {
    let correlation = 0;
    for (let index = 0; index < buffer.length - offset; index += 1)
      correlation += buffer[index] * buffer[index + offset];
    correlation /= buffer.length - offset;
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
  }
  return bestOffset < 0 || bestCorrelation < 0.01 ? null : sampleRate / bestOffset;
}
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}
export function normalizeContour(values: number[]): number[] {
  if (values.length < 4) return [];
  const trim = Math.max(1, Math.floor(values.length * 0.1));
  const sliced = values.slice(trim, Math.max(trim + 1, values.length - trim));
  const base = median(sliced);
  const semitones = sliced.map((value) => 12 * Math.log2(Math.max(value, 1) / base));
  const filtered = semitones.map((value, index) =>
    median(semitones.slice(Math.max(0, index - 1), Math.min(semitones.length, index + 2))),
  );
  return filtered.map((value) => Math.max(0, Math.min(1, (value + 6) / 12)));
}
export function resampleContour(values: number[], size = 16): number[] {
  if (!values.length) return [];
  return Array.from({ length: size }, (_, index) => {
    const position = (index * (values.length - 1)) / Math.max(size - 1, 1);
    const left = Math.floor(position);
    const right = Math.min(values.length - 1, Math.ceil(position));
    const amount = position - left;
    return values[left] * (1 - amount) + values[right] * amount;
  });
}
export function contourScore(reference: number[], attempt: number[]): number {
  if (attempt.length < 4) return 0;
  const a = resampleContour(reference);
  const b = resampleContour(attempt);
  const mae = a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0) / a.length;
  const da = a.slice(1).map((value, index) => value - a[index]);
  const db = b.slice(1).map((value, index) => value - b[index]);
  const meanA = da.reduce((x, y) => x + y, 0) / da.length;
  const meanB = db.reduce((x, y) => x + y, 0) / db.length;
  const numerator = da.reduce((sum, value, index) => sum + (value - meanA) * (db[index] - meanB), 0);
  const denominator =
    Math.sqrt(
      da.reduce((sum, value) => sum + (value - meanA) ** 2, 0) *
        db.reduce((sum, value) => sum + (value - meanB) ** 2, 0),
    ) || 1;
  const correlation = numerator / denominator;
  return Math.max(0, Math.min(1, 0.72 * (1 - mae) + 0.28 * ((correlation + 1) / 2)));
}
export function toneFeedback(reference: number[], attempt: number[]): StringKey {
  return attempt.length >= 4 && contourScore(reference, attempt) >= 0.68 ? "tones.correct" : "tones.tryAgain";
}
