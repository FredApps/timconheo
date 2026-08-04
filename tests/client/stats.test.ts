import { expect, test } from "vitest";
import { STORIES } from "../../app/data";
import { learnerStats } from "../../app/lib/stats";
import type { ProgressRecord, WordRecord } from "../../app/lib/api";

const word = (entry: string, status: WordRecord["status"]): WordRecord => ({
  entry,
  gloss: "",
  status,
  timesSeen: 1,
  firstSeen: 0,
  updatedAt: 0,
});

const progress = (
  storyId: string,
  sentencesRead: string[],
  updatedAt: number,
  done = true,
): ProgressRecord => ({
  storyId,
  sentencesRead,
  completedAt: done ? updatedAt : null,
  updatedAt,
});

test("syllables are counted from the text, not from the number of sentence ids", () => {
  const rhyme = STORIES.find((item) => item.id === "dong-dao-dung-dang")!;
  const ids = rhyme.sentences.map((sentence) => sentence.id);
  const stats = learnerStats([progress(rhyme.id, ids, Date.now())], [], STORIES);

  // Nine lines of four-ish syllables: the old code reported nine.
  expect(ids).toHaveLength(9);
  expect(stats.syllablesRead).toBeGreaterThan(20);
  const expected = rhyme.sentences.reduce(
    (sum, sentence) =>
      sum + sentence.tokens.reduce((n, token) => n + token.text.trim().split(/\s+/).length, 0),
    0,
  );
  expect(stats.syllablesRead).toBe(expected);
});

test("a sentence read twice is counted once", () => {
  const rhyme = STORIES.find((item) => item.id === "ca-dao-bau-oi")!;
  const ids = rhyme.sentences.map((sentence) => sentence.id);
  const once = learnerStats([progress(rhyme.id, ids, 1)], [], STORIES).syllablesRead;
  const twice = learnerStats(
    [progress(rhyme.id, ids, 1), progress(rhyme.id, ids, 2)],
    [],
    STORIES,
  ).syllablesRead;
  expect(twice).toBe(once);
});

test("an unknown sentence id contributes nothing rather than guessing", () => {
  expect(learnerStats([progress("gone", ["no-such-sentence"], 1)], [], STORIES).syllablesRead).toBe(0);
});

test("reading days are distinct local days, and completions are counted separately", () => {
  const day = 86400000;
  const base = new Date("2026-03-01T10:00:00").getTime();
  const stats = learnerStats(
    [
      progress("a", [], base),
      progress("b", [], base + 3600000), // same day
      progress("c", [], base + day, false), // next day, not finished
    ],
    [],
    STORIES,
  );
  expect(stats.readingDays).toBe(2);
  expect(stats.storiesCompleted).toBe(2);
});

test("rooted words counts only known", () => {
  const stats = learnerStats(
    [],
    [word("a", "known"), word("b", "learning"), word("c", "known"), word("d", "ignored")],
    STORIES,
  );
  expect(stats.knownWords).toBe(2);
});

test("a brand-new account reports honest zeros", () => {
  expect(learnerStats([], [], STORIES)).toEqual({
    knownWords: 0,
    syllablesRead: 0,
    readingDays: 0,
    storiesCompleted: 0,
  });
});
