import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Check, Circle, CircleDot, Pause, Play, Volume2 } from "lucide-react";
import type { ScaffoldMode, Story, Token, WordStatus } from "../types";
import type { StoryEstimate } from "../lib/difficulty";
import { BiText, T, useT } from "../i18n";
import { BAND_LABELS, KIND_LABELS, LICENSE_LABELS } from "../i18n/content";
import { mergeToken, normalizeEntry } from "../data/lexicon";
import { useSpeech } from "../lib/speech";
import { isSpeechCancelled } from "../lib/speech-control";
import { useAsyncAction } from "../lib/async";
import { AsyncButton, ErrorNote } from "../components/feedback";
import { PigMark } from "../components/PigMark";
import { Pill } from "../components/Pill";
import { AlphabetLab } from "./reader/AlphabetLab";
import { VoiceBadge } from "./reader/VoiceBadge";
import { WordPanel } from "./reader/WordPanel";
import { ToneLab } from "./tones/ToneLab";
import { UnknownLabel } from "./shared/UnknownLabel";

const MODES: ScaffoldMode[] = ["full", "assisted", "raw"];
const MODE_KEYS = { full: "reader.full", assisted: "reader.assisted", raw: "reader.raw" } as const;
const MIN_FONT = 19;
const MAX_FONT = 32;
const FONT_KEY = "tch-reader-size";

export default function ReaderView({
  story,
  estimate,
  statuses,
  onBack,
  onRemember,
  onStatus,
  onComplete,
}: {
  story: Story;
  estimate: StoryEstimate;
  statuses: Record<string, WordStatus>;
  onBack: () => void;
  onRemember: (token: Token, sentenceId: string) => Promise<void>;
  onStatus: (entry: string, status: WordStatus) => Promise<void>;
  onComplete: () => Promise<void>;
}) {
  const t = useT();
  const sizeId = useId();
  const { speak, stop } = useSpeech();

  const [mode, setMode] = useState<ScaffoldMode>("full");
  const [fontSize, setFontSize] = useState(() => {
    const stored = Number(window.localStorage.getItem(FONT_KEY));
    return Number.isFinite(stored) && stored >= MIN_FONT && stored <= MAX_FONT ? stored : 23;
  });
  const [selected, setSelected] = useState<{ token: Token; sentenceId: string } | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [showCentral, setShowCentral] = useState(true);
  const [playError, setPlayError] = useState(false);
  const listenAll = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(FONT_KEY, String(fontSize));
  }, [fontSize]);

  // Leaving the reading must silence it; otherwise a line keeps playing over the
  // next screen.
  useEffect(() => () => stop(), [stop]);

  const lineOf = useCallback(
    (index: number) => story.sentences[index].tokens.map((token) => token.text).join(" "),
    [story],
  );

  const playSentence = useCallback(
    async (index: number) => {
      listenAll.current = false;
      setPlayError(false);
      setPlaying(index);
      try {
        await speak(lineOf(index));
        setPlaying(null);
      } catch (error) {
        setPlaying(null);
        if (!isSpeechCancelled(error)) setPlayError(true);
      }
    },
    [lineOf, speak],
  );

  const playAll = useCallback(async () => {
    listenAll.current = true;
    setPlayError(false);
    try {
      for (let index = 0; index < story.sentences.length; index += 1) {
        // A cancellation between lines must stop the run, not skip a line.
        if (!listenAll.current) return;
        setPlaying(index);
        await speak(lineOf(index));
      }
      setPlaying(null);
    } catch (error) {
      setPlaying(null);
      if (!isSpeechCancelled(error)) setPlayError(true);
    } finally {
      listenAll.current = false;
    }
  }, [lineOf, speak, story.sentences.length]);

  const halt = useCallback(() => {
    listenAll.current = false;
    stop();
    setPlaying(null);
  }, [stop]);

  const complete = useAsyncAction(onComplete);

  const interactive =
    story.interactive === "alphabet" ? (
      <AlphabetLab />
    ) : story.interactive === "toneMatch" ? (
      <ToneLab />
    ) : null;

  return (
    <main className={"reader-page reader-mode--" + mode + (selected ? " panel-open" : "")}>
      <div className="reader-toolbar">
        <button type="button" className="back-button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          <T k="nav.back" />
        </button>

        <div className="reader-tools">
          <div className="segmented-control" role="group" aria-label={t("reader.help")}>
            {MODES.map((value) => (
              <button
                key={value}
                type="button"
                className={mode === value ? "active" : ""}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                <T k={MODE_KEYS[value]} />
              </button>
            ))}
          </div>

          <div className="font-control">
            <button
              type="button"
              className="icon-button"
              onClick={() => setFontSize((size) => Math.max(MIN_FONT, size - 1))}
              aria-label={t("reader.smaller")}
              disabled={fontSize <= MIN_FONT}
            >
              A
            </button>
            <label htmlFor={sizeId} className="visually-hidden">
              {t("reader.textSize")}
            </label>
            <input
              id={sizeId}
              type="range"
              min={MIN_FONT}
              max={MAX_FONT}
              value={fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
              aria-valuetext={`${fontSize}px`}
            />
            <button
              type="button"
              className="icon-button"
              onClick={() => setFontSize((size) => Math.min(MAX_FONT, size + 1))}
              aria-label={t("reader.larger")}
              disabled={fontSize >= MAX_FONT}
            >
              <strong>A</strong>
            </button>
          </div>

          <button
            type="button"
            className={"icon-button" + (showCentral ? " selected" : "")}
            onClick={() => setShowCentral((value) => !value)}
            aria-pressed={showCentral}
            aria-label={showCentral ? t("reader.centralNotesOn") : t("reader.centralNotesOff")}
          >
            {showCentral ? (
              <CircleDot size={18} aria-hidden="true" />
            ) : (
              <Circle size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <article className="reader-column">
        <header className="reader-heading">
          <p className="eyebrow">
            {t("library.tier", { tier: story.tier })} · <BiText value={KIND_LABELS[story.kind]} />
          </p>
          <h1 lang="vi">{story.title}</h1>
          <p className="story-translation">{story.titleEn}</p>
          <div className="reader-meta">
            <Pill tone="green">
              <UnknownLabel estimate={estimate} />
            </Pill>
            <span>{t("library.minutes", { count: estimate.minutes })}</span>
            <span>
              <BiText value={BAND_LABELS[estimate.band]} />
            </span>
          </div>

          <button
            type="button"
            className="audio-button"
            onClick={() => (playing === null ? void playAll() : halt())}
          >
            {playing === null ? (
              <Play size={17} aria-hidden="true" />
            ) : (
              <Pause size={17} aria-hidden="true" />
            )}
            <T k={playing === null ? "reader.listenAll" : "reader.stop"} />
          </button>
          <VoiceBadge />
          {playError && <ErrorNote messageKey="speech.unavailable" />}
        </header>

        {interactive}

        <div className="story-text" style={{ fontSize: fontSize + "px" }}>
          {story.sentences.map((sentence, index) => (
            <section
              key={sentence.id}
              className={"reader-sentence" + (playing === index ? " is-playing" : "")}
            >
              <button
                type="button"
                className="sentence-audio"
                onClick={() => void playSentence(index)}
                aria-label={t("reader.listenSentence", { number: index + 1 })}
              >
                <Volume2 size={16} aria-hidden="true" />
              </button>
              <div className="token-line" lang="vi">
                {sentence.tokens.map((raw, position) => {
                  const token = mergeToken(raw);
                  const status = statuses[normalizeEntry(token.entry)] ?? "unseen";
                  const isSelected =
                    selected?.token.entry === token.entry && selected.sentenceId === sentence.id;
                  return (
                    <button
                      type="button"
                      // A repeated word ("bé bé", "trâu ... trâu") needs its
                      // position in the key, or React reuses one node for both.
                      key={`${sentence.id}:${position}`}
                      className={"reader-token token--" + status + (isSelected ? " selected" : "")}
                      aria-pressed={isSelected}
                      onClick={() => setSelected({ token, sentenceId: sentence.id })}
                    >
                      <span className="token-word">{token.text}</span>
                      {mode === "full" && (
                        <span className="token-gloss" lang="en">
                          <BiText value={token.gloss} className="plain" />
                        </span>
                      )}
                      {showCentral && token.central && (
                        <span className="central-hint">
                          <BiText value={token.central} className="plain" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {mode !== "raw" && (
                <p className="sentence-translation">
                  <BiText value={sentence.translation} />
                </p>
              )}
            </section>
          ))}
        </div>

        {(story.grammarNotes?.length || story.culturalNotes?.length) && (
          <aside className="reader-learning-notes">
            {[...(story.grammarNotes ?? []), ...(story.culturalNotes ?? [])].map((note, index) => (
              <details key={`${note.title.en}:${index}`}>
                <summary>
                  <BiText value={note.title} />
                </summary>
                <p>
                  <BiText value={note.body} />
                </p>
              </details>
            ))}
          </aside>
        )}

        <footer className="reader-footer">
          <div className="end-mark" aria-hidden="true">
            <span />
            <PigMark small />
            <span />
          </div>
          <T as="h2" k="reader.done" />
          <p>{t("reader.syllablesRead", { count: estimate.syllables })}</p>
          <p className="attribution">
            <T k="reader.source" />:{" "}
            {story.sourceUrl ? (
              <a href={story.sourceUrl} target="_blank" rel="noreferrer">
                {story.source}
              </a>
            ) : (
              story.source
            )}{" "}
            · <BiText value={LICENSE_LABELS[story.license]} />
          </p>
          {story.attributionNote && (
            <p className="attribution attribution--note">
              <BiText value={story.attributionNote} />
            </p>
          )}

          <AsyncButton
            busy={complete.busy}
            busyLabelKey="reader.completing"
            onClick={() => {
              // Only leave once the save has actually landed, so a failure is
              // visible here instead of vanishing behind a navigation.
              void complete.run().then((ok) => {
                if (ok) onBack();
              });
            }}
          >
            <Check size={17} aria-hidden="true" />
            <T k="reader.complete" />
          </AsyncButton>
          {complete.errorKey && <ErrorNote messageKey={complete.errorKey} />}
        </footer>
      </article>

      {selected && (
        <WordPanel
          token={selected.token}
          sentenceId={selected.sentenceId}
          statuses={statuses}
          onClose={() => setSelected(null)}
          onRemember={onRemember}
          onStatus={onStatus}
        />
      )}
    </main>
  );
}
