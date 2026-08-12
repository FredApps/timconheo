import { beforeEach, expect, test, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewView from "../../app/views/ReviewView";
import type { CardRecord, QueueResponse } from "../../app/lib/api";
import { makeImport, renderApp } from "./helpers";

const card = (overrides: Partial<CardRecord> = {}): CardRecord => ({
  id: "recognition:hỏi",
  entry: "hỏi",
  gloss: "to ask",
  sourceSentenceId: "co-3",
  card: { reps: 2, stability: 5, scheduled_days: 1 },
  due: Date.now() - 1000,
  updatedAt: Date.now() - 2000,
  ...overrides,
});

const queue = (cards: CardRecord[]): QueueResponse => ({
  cards,
  budgetMs: 1200000,
  serverNow: Date.now(),
  forgiveness: null,
  newCount: 0,
});

function stubQueue(response: QueueResponse) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (String(url).includes("/cards/queue")) {
        return Promise.resolve(
          new Response(JSON.stringify(response), { headers: { "content-type": "application/json" } }),
        );
      }
      return Promise.reject(new Error("unexpected request"));
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("offline"))),
  );
});

test("an empty queue explains itself rather than showing a blank card", async () => {
  stubQueue(queue([]));
  renderApp(<ReviewView imports={[]} />);
  expect(await screen.findByText(/nothing is due right now/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /start gently/i })).not.toBeInTheDocument();
});

test("a failed load offers a retry instead of pretending the queue is empty", async () => {
  renderApp(<ReviewView imports={[]} />);
  const alert = await screen.findByRole("alert");
  expect(alert).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
});

test("context comes from the shipped corpus", async () => {
  stubQueue(queue([card()]));
  renderApp(<ReviewView imports={[]} />);

  await userEvent.click(await screen.findByRole("button", { name: /start gently/i }));
  await userEvent.click(screen.getByRole("button", { name: /show meaning/i }));
  expect(screen.getByText("Ba ăn cơm")).toBeInTheDocument();
});

test("context for a card saved from an imported text is resolved client-side", async () => {
  // No database migration: the sentence id is matched against the account's own
  // imports, rendered through the same segmenter the reader uses.
  const record = makeImport({ id: 4, raw: "Tôi đi chợ ở Hội An.\nTrời mưa." });
  stubQueue(queue([card({ sourceSentenceId: "import-4-2", entry: "mưa", gloss: "rain" })]));
  renderApp(<ReviewView imports={[record]} />);

  await userEvent.click(await screen.findByRole("button", { name: /start gently/i }));
  await userEvent.click(screen.getByRole("button", { name: /show meaning/i }));
  expect(screen.getByText("Trời mưa.")).toBeInTheDocument();
});

test("an unresolvable sentence id shows no context at all, rather than a fabricated one", async () => {
  stubQueue(queue([card({ sourceSentenceId: "gone-forever" })]));
  renderApp(<ReviewView imports={[]} />);

  await userEvent.click(await screen.findByRole("button", { name: /start gently/i }));
  await userEvent.click(screen.getByRole("button", { name: /show meaning/i }));
  expect(document.querySelector(".context-line")).toBeNull();
});

test("the session reports time, never a card count", async () => {
  stubQueue(queue([card(), card({ id: "b", entry: "mẹ" })]));
  renderApp(<ReviewView imports={[]} />);

  await userEvent.click(await screen.findByRole("button", { name: /start gently/i }));
  const progress = await screen.findByRole("progressbar");
  expect(progress).toHaveAttribute("aria-valuetext", expect.stringMatching(/minutes|almost/i));

  // Nothing anywhere should say "2 cards" or "1 of 2".
  expect(document.body.textContent).not.toMatch(/\b1 of 2\b/);
  expect(document.body.textContent).not.toMatch(/\bcards?\b/i);
});

test("running out of cards ends the session gracefully", async () => {
  const single = card();
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      const body = JSON.stringify(
        String(url).includes("/cards/queue")
          ? queue([single])
          : {
              // Scheduled far beyond this session, so it does not re-queue.
              card: { ...single, due: Date.now() + 90 * 86400000 },
              word: {
                entry: single.entry,
                gloss: "",
                status: "known",
                timesSeen: 1,
                firstSeen: 0,
                updatedAt: 0,
              },
            },
      );
      void init;
      return Promise.resolve(new Response(body, { headers: { "content-type": "application/json" } }));
    }),
  );

  renderApp(<ReviewView imports={[]} />);
  await userEvent.click(await screen.findByRole("button", { name: /start gently/i }));
  await userEvent.click(screen.getByRole("button", { name: /show meaning/i }));
  await userEvent.click(screen.getByRole("button", { name: /^good$/i }));

  await waitFor(() => expect(screen.getByText(/that is enough for now/i)).toBeInTheDocument());
});
