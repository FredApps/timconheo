import { useCallback, useEffect, useRef, useState } from "react";
import { Info, Mic, Square, Volume2 } from "lucide-react";
import { TONES } from "../../data";
import { BiText, T, useT } from "../../i18n";
import type { StringKey } from "../../i18n/strings";
import type { ToneKey } from "../../types";
import { api } from "../../lib/api";
import { contourScore, detectPitch, normalizeContour, toneFeedback } from "../../lib/pitch";
import { useSpeech } from "../../lib/speech";
import { ToneCanvas } from "./ToneCanvas";

const SILENCE_MS = 900;
const MAX_RECORD_MS = 9000;

export function ToneLab() {
  const t = useT();
  const { speak } = useSpeech();
  const [selected, setSelected] = useState<ToneKey>("hoi-nga");
  const [attempt, setAttempt] = useState<number[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [messageKey, setMessageKey] = useState<StringKey>("tones.micNeeded");
  const finishRef = useRef<(() => void) | null>(null);

  const tone = TONES.find((item) => item.key === selected)!;

  useEffect(() => () => finishRef.current?.(), []);

  const start = useCallback(async () => {
    if (recording) {
      finishRef.current?.();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessageKey("tones.micDenied");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      const pitches: number[] = [];
      let active = true;
      let lastVoice = Date.now();
      let frame = 0;

      setAttempt([]);
      setScore(null);
      setRecording(true);
      setMessageKey("tones.recording");

      const finish = () => {
        if (!active) return;
        active = false;
        finishRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        void audioContext.close();
        setRecording(false);
        const normalized = normalizeContour(pitches);
        setAttempt(normalized);
        const value = contourScore(tone.contour, normalized);
        setScore(value);
        setMessageKey(toneFeedback(tone.contour, normalized));
        // Per-tone accuracy over time is exactly what this drill needs, so the
        // attempt is recorded even when it misses.
        void api.addTone(tone.key, tone.example.split("/")[0].trim(), value).catch(() => undefined);
      };

      const capture = () => {
        if (!active) return;
        analyser.getFloatTimeDomainData(samples);
        const pitch = frame % 3 === 0 ? detectPitch(samples, audioContext.sampleRate) : null;
        if (pitch) {
          pitches.push(pitch);
          lastVoice = Date.now();
        }
        frame += 1;
        // Stop when the speaker stops, rather than on a fixed timer that cuts a
        // slow ngã in half.
        if (Date.now() - lastVoice > SILENCE_MS && pitches.length > 5) {
          finish();
          return;
        }
        requestAnimationFrame(capture);
      };

      finishRef.current = finish;
      capture();
      window.setTimeout(finish, MAX_RECORD_MS);
    } catch {
      setRecording(false);
      setMessageKey("tones.micDenied");
    }
  }, [recording, tone]);

  return (
    <div className="tone-lab paper-card">
      <div className="tone-tabs" role="group" aria-label={t("tones.chooseTone")}>
        {TONES.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={selected === item.key}
            className={selected === item.key ? "active" : ""}
            onClick={() => {
              setSelected(item.key);
              setAttempt([]);
              setScore(null);
            }}
          >
            <span lang="vi">{item.example}</span>
            <small>
              <BiText value={item.label} />
            </small>
          </button>
        ))}
      </div>

      <div className="tone-workbench">
        <div className="tone-syllable">
          <strong lang="vi">{tone.example}</strong>
          <small>
            <BiText value={tone.description} />
          </small>
          <button
            type="button"
            className="round-audio"
            onClick={() => void speak(tone.example.split("/")[0].trim()).catch(() => undefined)}
            aria-label={t("tones.listen")}
          >
            <Volume2 size={20} aria-hidden="true" />
          </button>
        </div>

        <ToneCanvas reference={tone.contour} attempt={attempt} shape={tone.description} />

        <div className="record-area">
          <button
            type="button"
            className={"record-button" + (recording ? " recording" : "")}
            onClick={() => void start()}
            aria-pressed={recording}
          >
            {recording ? <Square size={20} aria-hidden="true" /> : <Mic size={22} aria-hidden="true" />}
            <T k={recording ? "tones.stop" : "tones.record"} />
          </button>
          <p role="status" aria-live="polite">
            <T k={messageKey} />
            {score !== null && ` ${t("tones.scored", { percent: Math.round(score * 100) })}`}
          </p>
        </div>
      </div>

      <p className="approx-note">
        <Info size={15} aria-hidden="true" />
        <T k="tones.contoursAreStylised" />
      </p>
    </div>
  );
}
