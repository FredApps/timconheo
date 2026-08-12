import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReaderView from "../../app/views/ReaderView";
import { STORIES } from "../../app/data";
import { estimateStory } from "../../app/lib/difficulty";
import { renderApp } from "./helpers";

const story = STORIES.find((item) => item.id === "dong-dao-con-co-be-be")!;
const estimate = estimateStory(story, {});

function setup(overrides: Partial<Parameters<typeof ReaderView>[0]> = {}) {
  const props = {
    story,
    estimate,
    statuses: {},
    onBack: vi.fn(),
    onRemember: vi.fn().mockResolvedValue(undefined),
    onStatus: vi.fn().mockResolvedValue(undefined),
    onComplete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  renderApp(<ReaderView {...props} />);
  return props;
}

beforeEach(() => {
  // Nothing here should reach the network; speech is exercised in its own file.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("offline"))),
  );
});

test("a reading that repeats a word renders every occurrence", async () => {
  setup();
  const tokens = await screen.findAllByRole("button", { name: /^mẹ/i });
  expect(tokens).toHaveLength(3);
});

test("every token in the reading is rendered", () => {
  setup();
  const expected = story.sentences.reduce((sum, sentence) => sum + sentence.tokens.length, 0);
  const line = document.querySelectorAll(".token-line .reader-token");
  expect(line).toHaveLength(expected);
});

describe("finishing a reading", () => {
  test("navigates only after the save resolves", async () => {
    let resolveSave: () => void = () => undefined;
    const onComplete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const onBack = vi.fn();
    setup({ onComplete, onBack });

    await userEvent.click(screen.getByRole("button", { name: /finished reading/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    // Still on the page while the save is in flight.
    expect(onBack).not.toHaveBeenCalled();

    resolveSave();
    await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
  });

  test("a failed save keeps the reader open and says so", async () => {
    const onComplete = vi.fn().mockRejectedValue(new Error("nope"));
    const onBack = vi.fn();
    setup({ onComplete, onBack });

    await userEvent.click(screen.getByRole("button", { name: /finished reading/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
  });
});

describe("the word panel", () => {
  test("opens as a labelled modal dialog and traps Escape", async () => {
    setup();
    const token = screen.getAllByRole("button", { name: /^mẹ/i })[0];
    await userEvent.click(token);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName(/mẹ/i);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("returns focus to the word that opened it", async () => {
    setup();
    const token = screen.getAllByRole("button", { name: /^mẹ/i })[0];
    await userEvent.click(token);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(token));
  });

  test("saving a word closes the panel once the save resolves", async () => {
    const onRemember = vi.fn().mockResolvedValue(undefined);
    setup({ onRemember });

    await userEvent.click(screen.getAllByRole("button", { name: /^mẹ/i })[0]);
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /save for review/i }));

    await waitFor(() => expect(onRemember).toHaveBeenCalledTimes(1));
    expect(onRemember.mock.calls[0][0].entry).toBe("mẹ");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("a failed save leaves the panel open with an error", async () => {
    const onRemember = vi.fn().mockRejectedValue(new Error("nope"));
    setup({ onRemember });

    await userEvent.click(screen.getAllByRole("button", { name: /^mẹ/i })[0]);
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /save for review/i }));

    expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

test("the scaffolding control reports which mode is active", async () => {
  setup();
  const full = screen.getByRole("button", { name: /full help/i });
  const plain = screen.getByRole("button", { name: /plain text/i });
  expect(full).toHaveAttribute("aria-pressed", "true");

  await userEvent.click(plain);
  expect(plain).toHaveAttribute("aria-pressed", "true");
  expect(full).toHaveAttribute("aria-pressed", "false");
});

test("the source line and its licence are shown", () => {
  setup();
  expect(screen.getByText(/Original Tìm Con Heo learning material/)).toBeInTheDocument();
  expect(screen.getByText(/original app text/i)).toBeInTheDocument();
});

test("an original Central-set reading says it is not a dialect transcription", () => {
  const scene = STORIES.find((item) => item.id === "canh-buoi-sang-song-han")!;
  renderApp(
    <ReaderView
      story={scene}
      estimate={estimateStory(scene, {})}
      statuses={{}}
      onBack={vi.fn()}
      onRemember={vi.fn()}
      onStatus={vi.fn()}
      onComplete={vi.fn()}
    />,
  );
  expect(screen.getByText(/not a transcription of recorded regional speech/i)).toBeInTheDocument();
});
