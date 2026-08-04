import type { ProgressRecord, WordRecord } from "./api";
import type { Story } from "../types";
import { syllableCount } from "./difficulty";

export interface LearnerStats {
  /** Words the learner has marked or earned as known. */
  knownWords: number;
  /** Actual Vietnamese syllables in the sentences they have read. */
  syllablesRead: number;
  /** Distinct local calendar days on which they read something. */
  readingDays: number;
  /** Readings they finished. */
  storiesCompleted: number;
}

/**
 * Honest counts only.
 *
 * The previous version counted sentence *ids* and called them syllables, which
 * meant a nine-line rhyme scored nine. A number the app cannot defend is worse
 * than no number, so anything not computable from stored data is simply absent.
 */
export function learnerStats(
  progress: ProgressRecord[],
  words: WordRecord[],
  stories: Story[],
): LearnerStats {
  const syllablesBySentence = new Map<string, number>();
  for (const story of stories) {
    for (const sentence of story.sentences) {
      syllablesBySentence.set(
        sentence.id,
        sentence.tokens.reduce((sum, token) => sum + syllableCount(token.text), 0),
      );
    }
  }

  // A sentence read in two sessions is one sentence read, not two.
  const readSentences = new Set(progress.flatMap((record) => record.sentencesRead));
  let syllablesRead = 0;
  for (const id of readSentences) syllablesRead += syllablesBySentence.get(id) ?? 0;

  const days = new Set(
    progress.filter((record) => record.updatedAt).map((record) => new Date(record.updatedAt).toDateString()),
  );

  return {
    knownWords: words.filter((word) => word.status === "known").length,
    syllablesRead,
    readingDays: days.size,
    storiesCompleted: progress.filter((record) => record.completedAt).length,
  };
}
