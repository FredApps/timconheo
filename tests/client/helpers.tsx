import type { ReactElement, ReactNode } from "react";
import { render, type RenderResult } from "@testing-library/react";
import { LangProvider } from "../../app/i18n";
import { SpeechProvider } from "../../app/lib/speech";
import type { ImportRecord, ProgressRecord, WordRecord } from "../../app/lib/api";
import type { User } from "../../shared/types";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <SpeechProvider>{children}</SpeechProvider>
    </LangProvider>
  );
}

/** Render inside the same providers the real app uses. */
export function renderApp(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: Providers });
}

export const testUser: User = {
  id: "u1",
  username: "tester",
  isAdmin: false,
  disabled: false,
  createdAt: new Date(0).toISOString(),
};

export const makeWord = (entry: string, overrides: Partial<WordRecord> = {}): WordRecord => ({
  entry,
  gloss: "",
  status: "learning",
  timesSeen: 1,
  firstSeen: 0,
  updatedAt: 0,
  ...overrides,
});

export const makeProgress = (storyId: string, overrides: Partial<ProgressRecord> = {}): ProgressRecord => ({
  storyId,
  sentencesRead: [],
  completedAt: null,
  updatedAt: Date.now(),
  ...overrides,
});

export const makeImport = (overrides: Partial<ImportRecord> = {}): ImportRecord => ({
  id: 1,
  title: "My text",
  raw: "Tôi đi chợ.",
  importedAt: 0,
  difficulty: 2,
  ...overrides,
});
