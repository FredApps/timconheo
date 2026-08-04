import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, Volume2, X } from "lucide-react";
import { Rating } from "ts-fsrs";
import type { CardRecord, ImportRecord, QueueResponse } from "../lib/api";
import { api } from "../lib/api";
import { STORIES } from "../data";
import { storyFromImport } from "../lib/imports";
import { T, useT } from "../i18n";
import { useAsyncAction } from "../lib/async";
import { useSpeech } from "../lib/speech";
import { AsyncButton, ErrorNote, Spinner } from "../components/feedback";
import { PigMark } from "../components/PigMark";

const LENGTHS = [5, 10, 20];
/** Fetch at the maximum once, and let the clock decide when to stop. */
const MAX_MINUTES = 20;

const RATINGS = [
  { rating: Rating.Again, key: "review.again" },
  { rating: Rating.Hard, key: "review.hard" },
  { rating: Rating.Good, key: "review.good" },
  { rating: Rating.Easy, key: "review.easy" },
] as const;

export default function ReviewView({ imports }: { imports: ImportRecord[] }) {
  const t = useT();
  const { speak } = useSpeech();

  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [minutes, setMinutes] = useState(5);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [finished, setFinished] = useState(false);

  const load = useAsyncAction(async () => {
    setQueue(await api.queue(MAX_MINUTES));
  });

  useEffect(() => {
    void load.run();
    // Loading once on mount is the point; `load.run` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Sentences from every readable source, so a card saved from an imported text
   * still shows its context. Resolved here rather than stored on the card, which
   * would need a migration to say the same thing.
   */
  const sentences = useMemo(() => {
    const map = new Map<string, string>();
    for (const story of [...STORIES, ...imports.map(storyFromImport)]) {
      for (const sentence of story.sentences) {
        map.set(sentence.id, sentence.tokens.map((token) => token.text).join(" "));
      }
    }
    return map;
  }, [imports]);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, minutes * 60000 - (Date.now() - startedAt));
      setRemaining(left);
      if (left <= 0) {
        setStarted(false);
        setFinished(true);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [minutes, started, startedAt]);

  const current: CardRecord | undefined = queue?.cards[index];

  const rate = useAsyncAction(async (rating: Rating) => {
    if (!current) return;
    const response = await api.reviewCard(current.id, rating);
    setQueue((value) => {
      if (!value) return value;
      const cards = [...value.cards];
      // A lapse whose next due lands inside this session comes back later in it,
      // which is the whole reason short-term scheduling is enabled.
      const dueInSession = response.card.due <= Date.now() + Math.max(0, remaining);
      const alreadyQueuedLater = cards.some(
        (card, position) => card.id === response.card.id && position > index,
      );
      if (dueInSession && !alreadyQueuedLater) cards.push(response.card);
      return { ...value, cards };
    });
    setRevealed(false);
    setIndex((position) => position + 1);
  });

  // Running out of cards mid-session ends it cleanly instead of rendering a
  // blank card.
  useEffect(() => {
    if (started && queue && index >= queue.cards.length) {
      setStarted(false);
      setFinished(true);
    }
  }, [index, queue, started]);

  const begin = useCallback(() => {
    setStartedAt(Date.now());
    setRemaining(minutes * 60000);
    setIndex(0);
    setRevealed(false);
    setFinished(false);
    setStarted(true);
  }, [minutes]);

  if (!started) {
    const leftMinutes = Math.ceil(remaining / 60000);
    return (
      <main className="page feature-page review-page">
        <section className="feature-heading">
          <div>
            <T as="p" k="nav.review" className="eyebrow" />
            <T as="h1" k="review.title" />
            <T as="p" k="review.intro" />
          </div>
          <div className="review-clock" aria-hidden="true">
            <span>{minutes}</span>
            <T k="review.minutes" as="small" />
          </div>
        </section>

        <section className="session-picker paper-card">
          <div className="filter-row" role="group" aria-label={t("review.chooseLength")}>
            {LENGTHS.map((value) => (
              <button
                key={value}
                type="button"
                className={minutes === value ? "active" : ""}
                aria-pressed={minutes === value}
                onClick={() => setMinutes(value)}
              >
                {t("review.minutesCount", { count: value })}
              </button>
            ))}
          </div>

          {queue?.forgiveness && (
            <p className="save-confirm">
              <T k="review.forgiveness" />
            </p>
          )}

          {finished && (
            <div className="empty-review">
              <PigMark />
              <T as="h2" k="review.doneTitle" />
              <T as="p" k="review.doneBody" />
              {leftMinutes > 0 && <p className="soft-label">{t("review.left", { minutes: leftMinutes })}</p>}
            </div>
          )}

          {load.busy && <Spinner />}
          {load.errorKey && <ErrorNote messageKey={load.errorKey} onRetry={() => void load.run()} />}

          {!load.busy &&
            !load.errorKey &&
            !finished &&
            (queue && queue.cards.length > 0 ? (
              <button type="button" className="primary-button" onClick={begin}>
                <Play size={17} aria-hidden="true" />
                <T k="review.start" />
              </button>
            ) : (
              <div className="empty-review">
                <PigMark />
                <T as="h2" k="review.emptyTitle" />
                <T as="p" k="review.emptyBody" />
              </div>
            ))}
        </section>
      </main>
    );
  }

  if (!current) return null;

  const leftMinutes = Math.ceil(remaining / 60000);
  const leftText = leftMinutes <= 1 ? t("review.almost") : t("review.left", { minutes: leftMinutes });
  const elapsedPercent = Math.min(100, ((minutes * 60000 - remaining) / Math.max(minutes * 60000, 1)) * 100);
  const context = sentences.get(current.sourceSentenceId);

  return (
    <main className="page review-session">
      <div className="review-session-top">
        <button
          type="button"
          className="back-button"
          onClick={() => {
            setStarted(false);
            setFinished(true);
          }}
        >
          <X size={18} aria-hidden="true" />
          <T k="review.end" />
        </button>
        <span>{leftText}</span>
      </div>

      {/* Time, never a card count: the session promises minutes, so it shows minutes. */}
      <div
        className="review-progress"
        role="progressbar"
        aria-label={t("review.elapsed")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(elapsedPercent)}
        aria-valuetext={leftText}
      >
        <i style={{ width: elapsedPercent + "%" }} />
      </div>

      <section className="flash-card paper-card">
        <T as="p" k="review.context" className="eyebrow" />
        <button
          type="button"
          className="word-audio"
          onClick={() => void speak(current.entry).catch(() => undefined)}
          aria-label={t("reader.listenWord", { word: current.entry })}
        >
          <Volume2 size={18} aria-hidden="true" />
        </button>
        <h1 lang="vi">{current.entry}</h1>

        {!revealed ? (
          <button type="button" className="primary-button reveal-button" onClick={() => setRevealed(true)}>
            <T k="review.reveal" />
          </button>
        ) : (
          <>
            <p className="flash-gloss">{current.gloss}</p>
            {context && (
              <p className="context-line" lang="vi">
                {context}
              </p>
            )}
            <div className="rating-row" role="group" aria-label={t("review.reveal")}>
              {RATINGS.map(({ rating, key }) => (
                <AsyncButton key={rating} className="" busy={rate.busy} onClick={() => void rate.run(rating)}>
                  <T k={key} />
                </AsyncButton>
              ))}
            </div>
            {rate.errorKey && <ErrorNote messageKey={rate.errorKey} />}
          </>
        )}
      </section>
    </main>
  );
}
