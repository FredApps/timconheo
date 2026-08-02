import test from "node:test";
import assert from "node:assert/strict";
import { rankStories, estimateStory } from "../app/lib/difficulty";
import { STORIES } from "../app/data";

test("difficulty ranking is deterministic and places tier zero first", () => {
  const first = rankStories(STORIES, {}, []).map((story) => story.story.id);
  const second = rankStories(STORIES, {}, []).map((story) => story.story.id);
  assert.deepEqual(first, second);
  assert.equal(first[0], "tier0-alphabet");
});

test("story estimates expose honest unseen-token statistics", () => {
  const estimate = estimateStory(STORIES[0], {});
  assert.ok(estimate.minutes > 0);
  assert.equal(estimate.unknownRatio, 0.18);
  assert.ok(estimate.readinessDistance > 0);
});
