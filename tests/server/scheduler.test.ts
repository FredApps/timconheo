import assert from "node:assert/strict";
import test from "node:test";
import { forgiveBacklog, overdueness, packQueue } from "../../server/scheduler.js";
const card = (id: string, due: number, fresh = false) => ({
  id,
  entry: id,
  gloss: id,
  sourceSentenceId: "",
  due,
  updatedAt: due - 1000,
  card: {
    reps: fresh ? 0 : 2,
    stability: fresh ? 1 : 5,
    scheduled_days: 1,
    last_review: new Date(due - 86400000).toISOString(),
  },
});
test("relative overdueness orders a short card late above a long card barely late", () => {
  const now = Date.now();
  assert.ok(
    overdueness(card("short", now - 86400000), now) >
      overdueness(
        {
          ...card("long", now - 86400000),
          card: { ...card("long", now - 86400000).card, scheduled_days: 180 },
        },
        now,
      ),
  );
});
test("packing respects budget and interleaves new cards", () => {
  const result = packQueue(
    [card("old-1", 0), card("old-2", 0), card("new-1", 0, true), card("new-2", 0, true)],
    Date.now(),
    33000,
    0,
  );
  assert.ok(result.length > 0);
  assert.ok(result.length <= 3);
});
test("forgiveness is deterministic and applies once", () => {
  const now = Date.now();
  const result = forgiveBacklog([card("a", 0), card("b", 0)], now, { lastQueueAt: now - 15 * 86400000 });
  assert.equal(result.applied, true);
  assert.equal(result.cards.length, 2);
  assert.equal(forgiveBacklog([card("a", 0)], now, result.settings).applied, false);
});
