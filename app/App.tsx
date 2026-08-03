import { useCallback, useEffect, useMemo, useState } from "react";
import { Rating } from "ts-fsrs";
import { api } from "./lib/api";
import type { User } from "../shared/types";
import type { AppView, Story, ThemeMode, Token, WordStatus } from "./types";
import { STORIES } from "./data";
import { parseHash } from "./lib/hash";
import { rankStories } from "./lib/difficulty";
import { LangProvider, useLang } from "./i18n";
import { AppHeader, BottomNav, Toast } from "./components/ui"; import { SpeechProvider } from "./lib/speech";
import HomeView from "./views/HomeView";
import LibraryView from "./views/LibraryView";
import ReaderView from "./views/ReaderView";
import ReviewView from "./views/ReviewView";
import TonesView from "./views/TonesView";
import GardenView from "./views/GardenView";
import WordsView from "./views/WordsView";
import ImportView from "./views/ImportView";
import AboutView from "./views/AboutView";
import type { ImportRecord, ProgressRecord, WordRecord } from "./lib/api";

function AppInner({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const [view, setView] = useState<AppView>("home"); const [story, setStory] = useState<Story>(STORIES[0]); const [theme, setTheme] = useState<ThemeMode>("system"); const [words, setWords] = useState<WordRecord[]>([]); const [imports, setImports] = useState<ImportRecord[]>([]); const [progress, setProgress] = useState<ProgressRecord[]>([]); const [toast, setToast] = useState("");
  const { mode } = useLang();
  const refresh = useCallback(async () => { const state = await api.state(); setWords(state.words); setImports(state.imports); setProgress(state.progress); }, []);
  useEffect(() => { const storedTheme = window.localStorage.getItem("tch-theme") as ThemeMode | null; if (storedTheme) setTheme(storedTheme); const parsed = parseHash(window.location.hash); if (parsed.storyId) { const linked = STORIES.find((item) => item.id === parsed.storyId); if (linked) { setStory(linked); setView("reader"); } } else setView(parsed.view); void refresh(); if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) void navigator.serviceWorker.register(new URL("sw.js", document.baseURI).pathname).catch(() => undefined); }, [refresh]);
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme === "system" ? "light dark" : theme; window.localStorage.setItem("tch-theme", theme); }, [theme]);
  useEffect(() => { const onHash = () => { const parsed = parseHash(window.location.hash); if (parsed.storyId) { const linked = STORIES.find((item) => item.id === parsed.storyId); if (linked) { setStory(linked); setView("reader"); } } else setView(parsed.view); }; window.addEventListener("hashchange", onHash); window.addEventListener("popstate", onHash); return () => { window.removeEventListener("hashchange", onHash); window.removeEventListener("popstate", onHash); }; }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(timer); }, [toast]);
  const navigate = (next: AppView) => { setView(next); if (next !== "reader") window.history.pushState(null, "", "#" + next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const read = (nextStory: Story) => { setStory(nextStory); setView("reader"); window.history.pushState(null, "", "#read/" + nextStory.id); window.scrollTo(0, 0); };
  const statuses = useMemo(() => Object.fromEntries(words.map((word) => [word.entry.normalize("NFC").toLocaleLowerCase("vi"), word.status])), [words]);
  const completed = progress.filter((item) => item.completedAt).map((item) => item.storyId);
  const ranked = useMemo(() => rankStories(STORIES, statuses, completed), [statuses, completed.join("|")]);
  const learnerSyllables = progress.reduce((sum, item) => sum + item.sentencesRead.length, 0);
  const sessions = new Set(progress.flatMap((item) => item.updatedAt ? [new Date(item.updatedAt).toDateString()] : [])).size;
  const selectedEstimate = ranked.find((item) => item.story.id === story.id) ?? rankStories([story], statuses, completed)[0];
  const remember = async (token: Token, sentenceId: string) => { await api.rememberWord(token.entry, token.gloss.en, sentenceId); await refresh(); setToast("Saved " + token.entry + " for review."); };
  const setStatus = async (entry: string, status: WordStatus) => { await api.setWordStatus(entry, status); await refresh(); setToast(status === "known" ? entry + " is rooted." : "Updated " + entry + "."); };
  const completeStory = async (storyId: string) => { await api.saveProgress(storyId, story.sentences.map((item) => item.id), Date.now()); await refresh(); setToast("Reading added to your garden."); };
  const cycleTheme = () => setTheme((value) => value === "system" ? "light" : value === "light" ? "dark" : "system");
  return <div className="app-shell">{view !== "reader" && <AppHeader currentView={view} onNavigate={navigate} theme={theme} onTheme={cycleTheme} user={user} onSignOut={onSignOut} />}{view === "home" && <HomeView ranked={ranked} knownCount={words.filter((word) => word.status === "known").length} syllables={learnerSyllables} sessions={sessions} completedStories={completed} onRead={read} onNavigate={navigate} />}{view === "library" && <LibraryView ranked={ranked} onRead={read} />}{view === "reader" && <ReaderView story={story} estimate={selectedEstimate} statuses={statuses} onBack={() => navigate("library")} onRemember={remember} onStatus={setStatus} onComplete={() => void completeStory(story.id)} />}{view === "review" && <ReviewView />}{view === "tones" && <TonesView />}{view === "garden" && <GardenView knownCount={words.filter((word) => word.status === "known").length} completed={completed.length} />}{view === "words" && <WordsView words={words} onStatus={setStatus} />}{view === "import" && <ImportView imports={imports} onSaved={refresh} onOpen={read} />}{view === "about" && <AboutView />}{view !== "reader" && <BottomNav currentView={view} onNavigate={navigate} />}{toast && <Toast message={toast} />}</div>;
}
export default function App(props: { user: User; onSignOut: () => Promise<void> }) { return <LangProvider><SpeechProvider><AppInner {...props} /></SpeechProvider></LangProvider>; }
