import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "../shared/types";
import type { AppView, Story, ThemeMode, Token, WordStatus } from "./types";
import type { ImportRecord, ProgressRecord, WordRecord } from "./lib/api";
import { api } from "./lib/api";
import { STORIES } from "./data";
import { normalizeEntry } from "./data/lexicon";
import { parseHash, viewHash } from "./lib/hash";
import { rankStories } from "./lib/difficulty";
import { storyFromImport } from "./lib/imports";
import { learnerStats } from "./lib/stats";
import { useT } from "./i18n";
import { AppHeader } from "./components/AppHeader";
import { BottomNav } from "./components/BottomNav";
import { Toast } from "./components/Toast";
import { ErrorNote, Spinner } from "./components/feedback";
import { useAsyncAction } from "./lib/async";
import AboutView from "./views/AboutView";
import GardenView from "./views/GardenView";
import HomeView from "./views/HomeView";
import ImportView from "./views/ImportView";
import LibraryView from "./views/LibraryView";
import ReaderView from "./views/ReaderView";
import ReviewView from "./views/ReviewView";
import TonesView from "./views/TonesView";
import WordsView from "./views/WordsView";

export default function App({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const t = useT();

  const [view, setView] = useState<AppView>("home");
  const [story, setStory] = useState<Story>(STORIES[0]);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [words, setWords] = useState<WordRecord[]>([]);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [toast, setToast] = useState("");

  const refresh = useCallback(async () => {
    const state = await api.state();
    setWords(state.words);
    setImports(state.imports);
    setProgress(state.progress);
  }, []);

  const load = useAsyncAction(refresh);

  // Everything the reader can open: the shipped corpus plus this account's own
  // texts, so a deep link to an import resolves the same way a story does.
  const readable = useMemo(() => [...STORIES, ...imports.map(storyFromImport)], [imports]);

  const applyHash = useCallback(
    (hash: string) => {
      const parsed = parseHash(hash);
      if (parsed.storyId) {
        const linked = readable.find((item) => item.id === parsed.storyId);
        if (linked) {
          setStory(linked);
          setView("reader");
          return;
        }
      }
      setView(parsed.view);
    },
    [readable],
  );

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("tch-theme") as ThemeMode | null;
    if (storedTheme) setTheme(storedTheme);
    applyHash(window.location.hash);
    void load.run();
    if (
      "serviceWorker" in navigator &&
      (location.protocol === "https:" || location.hostname === "localhost")
    ) {
      void navigator.serviceWorker
        .register(new URL("sw.js", document.baseURI).pathname)
        .catch(() => undefined);
    }
    // Deliberately once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "system" ? "light dark" : theme;
    window.localStorage.setItem("tch-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => applyHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, [applyHash]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigate = useCallback((next: AppView) => {
    setView(next);
    window.history.pushState(null, "", viewHash(next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const read = useCallback((next: Story) => {
    setStory(next);
    setView("reader");
    window.history.pushState(null, "", `#read/${next.id}`);
    window.scrollTo(0, 0);
  }, []);

  const statuses = useMemo(
    () => Object.fromEntries(words.map((word) => [normalizeEntry(word.entry), word.status])),
    [words],
  );
  const completed = useMemo(
    () => progress.filter((item) => item.completedAt).map((item) => item.storyId),
    [progress],
  );
  const ranked = useMemo(() => rankStories(STORIES, statuses, completed), [statuses, completed]);
  const stats = useMemo(() => learnerStats(progress, words, readable), [progress, readable, words]);
  const estimate = useMemo(
    () => ranked.find((item) => item.story.id === story.id) ?? rankStories([story], statuses, completed)[0],
    [completed, ranked, statuses, story],
  );

  const remember = useCallback(
    async (token: Token, sentenceId: string) => {
      await api.rememberWord(token.entry, token.gloss.en, sentenceId);
      await refresh();
      setToast(t("reader.savedWord", { entry: token.entry }));
    },
    [refresh, t],
  );

  const setStatus = useCallback(
    async (entry: string, status: WordStatus) => {
      await api.setWordStatus(entry, status);
      await refresh();
      setToast(status === "known" ? t("reader.rootedWord", { entry }) : t("reader.updatedWord", { entry }));
    },
    [refresh, t],
  );

  const completeStory = useCallback(async () => {
    await api.saveProgress(
      story.id,
      story.sentences.map((item) => item.id),
      Date.now(),
    );
    await refresh();
    setToast(t("reader.completedStory"));
  }, [refresh, story, t]);

  const cycleTheme = useCallback(
    () => setTheme((value) => (value === "system" ? "light" : value === "light" ? "dark" : "system")),
    [],
  );

  return (
    <div className="app-shell">
      {view !== "reader" && (
        <AppHeader
          currentView={view}
          onNavigate={navigate}
          theme={theme}
          onTheme={cycleTheme}
          user={user}
          onSignOut={onSignOut}
        />
      )}

      {load.busy && view !== "reader" && <Spinner />}
      {load.errorKey && view !== "reader" && (
        <ErrorNote messageKey={load.errorKey} onRetry={() => void load.run()} />
      )}

      {view === "home" && (
        <HomeView
          ranked={ranked}
          stats={stats}
          completedStories={completed}
          onRead={read}
          onNavigate={navigate}
        />
      )}
      {view === "library" && <LibraryView ranked={ranked} onRead={read} />}
      {view === "reader" && (
        <ReaderView
          story={story}
          estimate={estimate}
          statuses={statuses}
          onBack={() => navigate("library")}
          onRemember={remember}
          onStatus={setStatus}
          onComplete={completeStory}
        />
      )}
      {view === "review" && <ReviewView imports={imports} />}
      {view === "tones" && <TonesView />}
      {view === "garden" && <GardenView stats={stats} />}
      {view === "words" && <WordsView words={words} onStatus={setStatus} />}
      {view === "import" && <ImportView imports={imports} onSaved={refresh} onOpen={read} />}
      {view === "about" && <AboutView />}

      {view !== "reader" && <BottomNav currentView={view} onNavigate={navigate} />}
      {toast && <Toast message={toast} />}
    </div>
  );
}
