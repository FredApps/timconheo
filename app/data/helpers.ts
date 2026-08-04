import type { Bi, Sentence } from "../types";

/** Bilingual string pair. Every learner-facing label is written in both languages. */
export const bi = (en: string, vi: string): Bi => ({ en, vi });

/**
 * One displayed line.
 *
 * A token is either a bare word, or `[displayed, dictionaryEntry]` when the two
 * differ -- because the displayed form carries capitalisation or punctuation
 * ("Buổi sáng,") while the dictionary entry must not ("buổi sáng").
 *
 * Joining every token's displayed text with single spaces has to reproduce the
 * source line exactly; `tests/client/corpus.test.ts` enforces that, which is
 * what stops a reading from quietly losing a word during an edit.
 */
export const line = (id: string, translation: Bi, words: Array<string | [string, string]>): Sentence => ({
  id,
  translation,
  tokens: words.map((word) => (Array.isArray(word) ? { text: word[0], entry: word[1] } : { text: word })),
});
