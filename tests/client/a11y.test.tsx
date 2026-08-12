import { beforeEach, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import type { ReactElement } from "react";
import AboutView from "../../app/views/AboutView";
import GardenView from "../../app/views/GardenView";
import HomeView from "../../app/views/HomeView";
import ImportView from "../../app/views/ImportView";
import LibraryView from "../../app/views/LibraryView";
import LoginView from "../../app/LoginView";
import ReaderView from "../../app/views/ReaderView";
import TonesView from "../../app/views/TonesView";
import WordsView from "../../app/views/WordsView";
import { AppHeader } from "../../app/components/AppHeader";
import { BottomNav } from "../../app/components/BottomNav";
import { STORIES } from "../../app/data";
import { estimateStory, rankStories } from "../../app/lib/difficulty";
import { learnerStats } from "../../app/lib/stats";
import { makeImport, makeWord, renderApp, testUser } from "./helpers";

const ranked = rankStories(STORIES, {}, []);
const stats = learnerStats([], [], STORIES);

/**
 * axe cannot tell us the interface is good; it can tell us it is not obviously
 * broken. Colour contrast is excluded because jsdom has no layout or computed
 * colours, so any result it produced would be noise.
 */
async function expectNoViolations(ui: ReactElement) {
  const { container } = renderApp(ui);
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  const summary = results.violations.map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(" | ")}`,
  );
  expect(summary).toEqual([]);
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("offline"))),
  );
});

const noop = () => undefined;
const asyncNoop = () => Promise.resolve();

test("sign in", async () => {
  await expectNoViolations(<LoginView allowSignups onSignedIn={noop} />);
});

test("home", async () => {
  await expectNoViolations(
    <HomeView ranked={ranked} stats={stats} completedStories={[]} onRead={noop} onNavigate={noop} />,
  );
});

test("library", async () => {
  await expectNoViolations(<LibraryView ranked={ranked} onRead={noop} />);
}, 30_000);

test("reader", async () => {
  await expectNoViolations(
    <ReaderView
      story={STORIES[3]}
      estimate={estimateStory(STORIES[3], {})}
      statuses={{}}
      onBack={noop}
      onRemember={asyncNoop}
      onStatus={asyncNoop}
      onComplete={asyncNoop}
    />,
  );
});

test("tones", async () => {
  await expectNoViolations(<TonesView />);
});

test("words", async () => {
  await expectNoViolations(<WordsView words={[makeWord("hỏi", { gloss: "to ask" })]} onStatus={asyncNoop} />);
});

test("my texts", async () => {
  await expectNoViolations(<ImportView imports={[makeImport()]} onSaved={asyncNoop} onOpen={noop} />);
});

test("garden", async () => {
  await expectNoViolations(<GardenView stats={stats} />);
});

test("about", async () => {
  await expectNoViolations(<AboutView />);
});

test("header and bottom navigation", async () => {
  await expectNoViolations(
    <>
      <AppHeader
        currentView="home"
        onNavigate={noop}
        theme="system"
        onTheme={noop}
        user={testUser}
        onSignOut={noop}
      />
      <BottomNav currentView="home" onNavigate={noop} />
    </>,
  );
});

test("the open word panel", async () => {
  const { container } = renderApp(
    <ReaderView
      story={STORIES[3]}
      estimate={estimateStory(STORIES[3], {})}
      statuses={{}}
      onBack={noop}
      onRemember={asyncNoop}
      onStatus={asyncNoop}
      onComplete={asyncNoop}
    />,
  );
  await userEvent.click(screen.getAllByRole("button", { name: /^mẹ/i })[0]);
  await screen.findByRole("dialog");
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("the current destination is marked in both navigation bars", () => {
  renderApp(
    <>
      <AppHeader
        currentView="library"
        onNavigate={noop}
        theme="light"
        onTheme={noop}
        user={testUser}
        onSignOut={noop}
      />
      <BottomNav currentView="library" onNavigate={noop} />
    </>,
  );
  const current = screen.getAllByRole("button", { current: "page" });
  expect(current).toHaveLength(2);
});

test("each navigation item announces once, not twice in two languages", () => {
  renderApp(<BottomNav currentView="home" onNavigate={noop} />);
  const home = screen.getByRole("button", { name: "Home" });
  expect(home).toHaveAccessibleName("Home");
});
