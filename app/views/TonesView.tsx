import { useState } from "react";
import { Ear, Info, Play } from "lucide-react";
import { TONES } from "../data";
import { BiText, T, useT } from "../i18n";
import type { ToneKey } from "../types";
import { api } from "../lib/api";
import { useSpeech } from "../lib/speech";
import { ToneLab } from "./tones/ToneLab";

export default function TonesView() {
  const t = useT();
  const { speak } = useSpeech();
  const [demoSyllable, setDemoSyllable] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ToneKey | null>(null);
  const [answer, setAnswer] = useState<ToneKey | null>(null);

  const playChallenge = () => {
    const tone = TONES[Math.floor(Math.random() * TONES.length)];
    setChallenge(tone.key);
    setAnswer(null);
    void speak(tone.example.split("/")[0].trim()).catch(() => undefined);
  };

  const correct = answer !== null && answer === challenge;

  return (
    <main className="page feature-page">
      <section className="feature-heading">
        <div>
          <T as="p" k="nav.tones" className="eyebrow" />
          <T as="h1" k="tones.title" />
          <T as="p" k="tones.intro" />
        </div>
        <div className="tone-count">
          <strong>{TONES.length}</strong>
          <T k="tones.count" as="span" />
        </div>
      </section>

      <ToneLab />

      {/*
        Two different exercises, deliberately separated. The first has no right
        answer -- mả and mã genuinely merge here, and pretending otherwise would
        teach the wrong thing. The second is a real forced choice.
      */}
      <section className="perception-card paper-card">
        <div className="teaser-icon" aria-hidden="true">
          <Ear size={24} />
        </div>
        <div>
          <T as="h2" k="tones.demoTitle" />
          <T as="p" k="tones.demoBody" />
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            const choice = Math.random() > 0.5 ? "mả" : "mã";
            setDemoSyllable(choice);
            void speak(choice).catch(() => undefined);
          }}
        >
          <Play size={16} aria-hidden="true" />
          <T k="tones.listen" />
        </button>
        {demoSyllable && (
          <p className="gentle-answer" role="status" aria-live="polite">
            {t("tones.demoHeard", { syllable: demoSyllable })}
          </p>
        )}
      </section>

      <section className="perception-card paper-card">
        <div className="teaser-icon" aria-hidden="true">
          <Info size={24} />
        </div>
        <div>
          <T as="h2" k="tones.checkTitle" />
          <T as="p" k="tones.checkBody" />
        </div>
        <button type="button" className="secondary-button" onClick={playChallenge}>
          <Play size={16} aria-hidden="true" />
          <T k="tones.checkPlay" />
        </button>

        {challenge && (
          <div className="pair-buttons" role="group" aria-label={t("tones.choose")}>
            {TONES.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={answer === item.key}
                disabled={answer !== null}
                onClick={() => {
                  setAnswer(item.key);
                  void api
                    .addTone(item.key, item.example.split("/")[0].trim(), item.key === challenge ? 1 : 0)
                    .catch(() => undefined);
                }}
              >
                <BiText value={item.label} />
              </button>
            ))}
          </div>
        )}
        {answer !== null && (
          <p className="gentle-answer" role="status" aria-live="polite">
            <T k={correct ? "tones.correct" : "tones.tryAgain"} />
          </p>
        )}
      </section>
    </main>
  );
}
