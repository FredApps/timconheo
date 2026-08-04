import { expect, test } from "vitest";
import { STORIES } from "../../app/data";
import {
  TARGET_UNKNOWN,
  bandFor,
  difficultyBreakdown,
  estimateStory,
  normalizeVi,
  personalUnknownRatio,
  rankStories,
} from "../../app/lib/difficulty";
import type { Story, WordStatus } from "../../app/types";

const story = (id: string, lines: string[][]): Story => ({
  id,
  title: id,
  titleEn: id,
  tier: 1,
  kind: "scene",
  region: "national",
  description: { en: id, vi: id },
  source: "test",
  license: "original",
  pattern: "sprout",
  sentences: lines.map((tokens, index) => ({
    id: `${id}-${index}`,
    translation: { en: "", vi: tokens.join(" ") },
    tokens: tokens.map((text) => ({ text })),
  })),
});

test("ranking is deterministic and returns every reading", () => {
  const first = rankStories(STORIES, {}, []).map((item) => item.story.id);
  const second = rankStories(STORIES, {}, []).map((item) => item.story.id);
  expect(first).toEqual(second);
  expect(first).toHaveLength(STORIES.length);
  expect(new Set(first).size).toBe(STORIES.length);
});

test("tier zero comes first, and difficulty never hides a reading", () => {
  const ranked = rankStories(STORIES, {}, []);
  expect(ranked[0].story.tier).toBe(0);
  // Every shipped story is present at every learner state we can construct.
  const allKnown: Record<string, WordStatus> = Object.fromEntries(
    STORIES.flatMap((item) =>
      item.sentences.flatMap((sentence) =>
        sentence.tokens.map((token) => [normalizeVi(token.entry ?? token.text), "known"]),
      ),
    ),
  );
  expect(rankStories(STORIES, allKnown, []).length).toBe(STORIES.length);
});

test("a fresh account is told its unfamiliarity is unmeasured, not invented", () => {
  const estimate = estimateStory(STORIES[0], {});
  expect(estimate.unknownIsUnmeasured).toBe(true);
  // No blended baseline: the raw ratio is honest, the flag is what the UI reads.
  expect(estimate.unknownRatio).toBe(1);
  expect(estimate.minutes).toBeGreaterThan(0);
});

test("unfamiliarity counts instances, and a word being learned counts half", () => {
  const subject = story("s", [["a", "b", "a", "c"]]);
  expect(personalUnknownRatio(subject, {})).toBe(1);
  expect(personalUnknownRatio(subject, { a: "known" })).toBe(0.5);
  expect(personalUnknownRatio(subject, { a: "learning" })).toBe(0.75);
  expect(personalUnknownRatio(subject, { a: "ignored", b: "known", c: "known" })).toBe(0);
});

test("longer sentences and rarer words both raise the score", () => {
  const short = difficultyBreakdown(story("short", [["tôi", "ăn", "cơm"]]));
  const long = difficultyBreakdown(
    story("long", [["tôi", "ăn", "cơm", "với", "bạn", "ở", "nhà", "vào", "buổi sáng", "hôm nay"]]),
  );
  expect(long.score).toBeGreaterThan(short.score);

  const common = difficultyBreakdown(story("common", [["tôi", "ăn", "cơm"]]));
  const rare = difficultyBreakdown(story("rare", [["quản công", "nghiệp", "xệp"]]));
  expect(rare.rareRatio).toBeGreaterThan(common.rareRatio);
  expect(rare.score).toBeGreaterThan(common.score);
});

test("scores stay inside the band the label promises", () => {
  expect(bandFor(1)).toBe("gentle");
  expect(bandFor(2.9)).toBe("gentle");
  expect(bandFor(3)).toBe("steady");
  expect(bandFor(5)).toBe("stretch");
  expect(bandFor(7)).toBe("hard");
  for (const item of STORIES) {
    const breakdown = difficultyBreakdown(item);
    expect(breakdown.score).toBeGreaterThanOrEqual(1);
    expect(breakdown.score).toBeLessThanOrEqual(10);
    expect(breakdown.band).toBe(bandFor(breakdown.score));
  }
});

test("decomposed input scores identically to composed input", () => {
  const composed = story("composed", [["hỏi", "mẹ"]]);
  const decomposed = story("decomposed", [["hỏi".normalize("NFD"), "mẹ".normalize("NFD")]]);
  expect(difficultyBreakdown(decomposed).rareRatio).toBe(difficultyBreakdown(composed).rareRatio);
  expect(personalUnknownRatio(decomposed, { hỏi: "known" })).toBe(
    personalUnknownRatio(composed, { hỏi: "known" }),
  );
});

test("readiness prefers a reading close to the target unfamiliarity", () => {
  const easy = story("easy", [["tôi", "ăn"]]);
  const hard = story("hard", [["quản công", "nghiệp", "xệp", "nhấm"]]);
  const statuses: Record<string, WordStatus> = { tôi: "known", ăn: "known", "quản công": "new" };
  const [first] = rankStories([hard, easy], statuses, []);
  expect(first.story.id).toBe("easy");
  expect(estimateStory(easy, statuses).readinessDistance).toBeLessThan(
    estimateStory(hard, statuses).readinessDistance,
  );
  expect(TARGET_UNKNOWN).toBeGreaterThan(0);
});

test("overshooting the target is penalised more than undershooting it", () => {
  const under = estimateStory(story("u", [["tôi", "ăn"]]), { tôi: "known", ăn: "known" });
  expect(under.unknownRatio).toBe(0);
  // 0.06 below target vs 0.06 above: the harder one must rank worse.
  const over = estimateStory(story("o", [["tôi", "xệp"]]), { tôi: "known" });
  expect(over.unknownRatio).toBeGreaterThan(TARGET_UNKNOWN);
  expect(over.readinessDistance).toBeGreaterThan(under.readinessDistance);
});
