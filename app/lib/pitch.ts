export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  let rms = 0;
  for (const sample of buffer) rms += sample * sample;
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.012) return null;

  const minLag = Math.floor(sampleRate / 420);
  const maxLag = Math.min(Math.floor(sampleRate / 70), buffer.length - 2);
  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let normA = 0;
    let normB = 0;
    for (let index = 0; index < buffer.length - lag; index += 2) {
      const a = buffer[index];
      const b = buffer[index + lag];
      correlation += a * b;
      normA += a * a;
      normB += b * b;
    }
    const normalized = correlation / Math.sqrt(normA * normB || 1);
    if (normalized > bestCorrelation) {
      bestCorrelation = normalized;
      bestLag = lag;
    }
  }

  return bestLag > 0 && bestCorrelation > 0.72 ? sampleRate / bestLag : null;
}

export function normalizeContour(values: number[]): number[] {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  if (valid.length < 2) return [];
  const sorted = [...valid].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const semitones = valid.map((value) => 12 * Math.log2(value / median));
  const min = Math.min(...semitones);
  const max = Math.max(...semitones);
  const range = Math.max(max - min, 1.5);
  return semitones.map((value) => 0.18 + ((value - min) / range) * 0.7);
}

export function toneFeedback(reference: number[], attempt: number[]): string {
  if (attempt.length < 3) return "Thử nói gần mic hơn để mình nghe rõ đường thanh nhé.";
  const startDiff = Math.abs(reference[0] - attempt[0]);
  const refSlope = reference.at(-1)! - reference[0];
  const attemptSlope = attempt.at(-1)! - attempt[0];
  if (startDiff > 0.28) return attempt[0] > reference[0] ? "Bắt đầu thấp hơn một chút." : "Bắt đầu cao hơn một chút.";
  if (Math.sign(refSlope) !== Math.sign(attemptSlope) && Math.abs(refSlope) > 0.2) return refSlope > 0 ? "Giữ giọng đi lên ở cuối." : "Thả giọng xuống ở cuối.";
  if (Math.abs(refSlope - attemptSlope) > 0.32) return refSlope > attemptSlope ? "Cho phần cuối vút lên rõ hơn." : "Đường thanh tốt rồi; thử nhẹ độ dốc một chút.";
  return "Đường thanh đã đúng hướng. Nghe lại rồi thử một lần nữa nếu bạn muốn.";
}
