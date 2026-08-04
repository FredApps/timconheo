import freq from "../data/freq-core.json";
import type { Story, WordStatus } from "../types";

export type DifficultyBand = "gentle" | "steady" | "stretch" | "hard";

export interface DifficultyBreakdown {
  /** 1--10 intrinsic difficulty. User-independent. */
  score: number;
  band: DifficultyBand;
  meanSentenceSyllables: number;
  rareRatio: number;
  typeTokenRatio: number;
  polysyllableRatio: number;
  clauseLinkerRatio: number;
  syllables: number;
}

export interface StoryEstimate extends DifficultyBreakdown {
  story: Story;
  /** 0--1 share of this reading's words the learner has not met. */
  unknownRatio: number;
  /** True when the learner has tracked no words at all, so unknownRatio is trivially 1. */
  unknownIsUnmeasured: boolean;
  minutes: number;
  readinessDistance: number;
  completed: boolean;
}

/**
 * Weights are frozen reference values chosen by hand, not fitted to this corpus.
 * Fitting them would mean that adding one reading silently re-scored every
 * existing one, and `tests/client/difficulty.test.ts` would be unwritable.
 */
const WEIGHTS = {
  base: 1.2,
  sentenceLength: 0.13,
  rare: 2.8,
  repetition: 1.2,
  polysyllable: 1.4,
  clauseLinker: 1.1,
} as const;

/** The share of unknown words that makes a reading a comfortable next step. */
export const TARGET_UNKNOWN = 0.06;
/** Overshooting the target hurts more than undershooting it. */
const OVERSHOOT_PENALTY = 1.6;
/** Reading pace assumption for the minutes estimate, in syllables per minute. */
const SYLLABLES_PER_MINUTE = 55;

const FREQ_WORDS = new Set(freq.words.map(normalizeVi));

export const FREQ_PROVENANCE: string = freq.provenance;
export const FREQ_SIZE = FREQ_WORDS.size;

export function normalizeVi(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("vi");
}

/** Vietnamese writes syllables separately, so whitespace is a real syllable count. */
export function syllableCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function entriesOf(story: Story): string[] {
  return story.sentences.flatMap((sentence) => sentence.tokens.map((token) => token.entry ?? token.text));
}

export function storySyllables(story: Story): number {
  return story.sentences.reduce(
    (sum, sentence) => sum + sentence.tokens.reduce((n, token) => n + syllableCount(token.text), 0),
    0,
  );
}

export function difficultyBreakdown(story: Story): DifficultyBreakdown {
  const entries = entriesOf(story);
  const total = Math.max(entries.length, 1);
  const unique = new Set(entries.map(normalizeVi));

  const rareRatio = entries.filter((entry) => !FREQ_WORDS.has(normalizeVi(entry))).length / total;
  const sizes = story.sentences.map((sentence) =>
    sentence.tokens.reduce((sum, token) => sum + syllableCount(token.text), 0),
  );
  const meanSentenceSyllables = sizes.reduce((a, b) => a + b, 0) / Math.max(sizes.length, 1);
  const typeTokenRatio = unique.size / total;
  const polysyllableRatio = entries.filter((entry) => syllableCount(entry) > 1).length / total;
  const clauseLinkerRatio =
    entries.filter((entry) =>
      ["và", "nhưng", "vì", "nên", "thì", "mà", "tuy rằng", "đã", "chưa", "rồi", "còn"].includes(
        normalizeVi(entry),
      ),
    ).length / total;

  const raw =
    WEIGHTS.base +
    meanSentenceSyllables * WEIGHTS.sentenceLength +
    rareRatio * WEIGHTS.rare +
    (1 - typeTokenRatio) * WEIGHTS.repetition +
    polysyllableRatio * WEIGHTS.polysyllable +
    clauseLinkerRatio * WEIGHTS.clauseLinker;
  const score = Math.max(1, Math.min(10, Math.round(raw * 10) / 10));

  return {
    score,
    band: bandFor(score),
    meanSentenceSyllables,
    rareRatio,
    typeTokenRatio,
    polysyllableRatio,
    clauseLinkerRatio,
    syllables: storySyllables(story),
  };
}

export function bandFor(score: number): DifficultyBand {
  return score < 3 ? "gentle" : score < 5 ? "steady" : score < 7 ? "stretch" : "hard";
}

/**
 * How much of this reading is unfamiliar, over token *instances* rather than
 * types, so a word that appears four times counts four times -- that is what the
 * reading actually feels like.
 *
 * A word being actively reviewed is not the same friction as one never met, so
 * `learning` counts as half.
 */
export function personalUnknownRatio(story: Story, statuses: Record<string, WordStatus>): number {
  const entries = entriesOf(story);
  if (!entries.length) return 0;
  const weights: Record<WordStatus, number> = { known: 0, ignored: 0, learning: 0.5, new: 1 };
  const sum = entries.reduce((total, entry) => total + weights[statuses[normalizeVi(entry)] ?? "new"], 0);
  return sum / entries.length;
}

export function estimateStory(
  story: Story,
  statuses: Record<string, WordStatus>,
  completed = false,
): StoryEstimate {
  const breakdown = difficultyBreakdown(story);
  const trackedWords = Object.keys(statuses).length;
  // No blended baseline. A brand-new account genuinely knows nothing, and
  // inventing an 18% familiarity for it was a number the app could not defend.
  // The UI says "not measured yet" instead of showing a percentage it made up.
  const unknownRatio = personalUnknownRatio(story, statuses);
  const minutes = Math.max(1, Math.ceil(breakdown.syllables / SYLLABLES_PER_MINUTE));
  const distance = Math.abs(unknownRatio - TARGET_UNKNOWN);
  return {
    ...breakdown,
    story,
    unknownRatio,
    unknownIsUnmeasured: trackedWords === 0,
    minutes,
    readinessDistance: distance * (unknownRatio > TARGET_UNKNOWN ? OVERSHOOT_PENALTY : 1),
    completed,
  };
}

/**
 * Ranking sorts and labels; it never gates. Every story is always returned, and
 * nothing in the library is ever disabled.
 *
 * Before a learner has tracked any words, personal readiness carries no
 * information, so ordering falls back to intrinsic difficulty.
 */
export function rankStories(
  stories: Story[],
  statuses: Record<string, WordStatus>,
  completedIds: string[],
): StoryEstimate[] {
  const measured = Object.keys(statuses).length > 0;
  return stories
    .map((story) => estimateStory(story, statuses, completedIds.includes(story.id)))
    .sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        a.story.tier - b.story.tier ||
        (measured ? a.readinessDistance - b.readinessDistance : a.score - b.score) ||
        a.minutes - b.minutes ||
        a.story.id.localeCompare(b.story.id),
    );
}
