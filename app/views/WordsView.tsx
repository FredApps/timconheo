import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { WordRecord } from "../lib/api";
import type { WordStatus } from "../types";
import { T, useT } from "../i18n";
import { PigMark } from "../components/ui";
export default function WordsView({ words, onStatus }: { words: WordRecord[]; onStatus: (entry: string, status: WordStatus) => Promise<void> }) {
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState<"all" | WordStatus>("all"); const t = useT();
  const visible = useMemo(() => words.filter((word) => (filter === "all" || word.status === filter) && word.entry.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))), [words, filter, query]);
  return <main className="page feature-page words-page"><section className="feature-heading"><div><p className="eyebrow"><T k="nav.words" /></p><h1><T k="words.title" /></h1><p><T k="words.intro" /></p></div></section><div className="word-controls"><label><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("words.search")} /></label><div className="filter-row">{(["all","new","learning","known"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? t("words.all") : value}</button>)}</div></div><div className="word-list paper-card">{visible.length === 0 && <div className="empty-words"><PigMark /><h2><T k="words.empty" /></h2><p><T k="words.emptyBody" /></p></div>}{visible.map((word) => <article key={word.entry}><span className={"status-seed status-seed--" + word.status} /><div><h3 lang="vi">{word.entry}</h3><p>{word.gloss}</p></div><span className="seen-count">{word.timesSeen}×</span><select value={word.status} onChange={(event) => void onStatus(word.entry, event.target.value as WordStatus)} aria-label={t("reader.wordStatus") + " " + word.entry}><option value="new">{t("reader.new")}</option><option value="learning">{t("reader.learning")}</option><option value="known">{t("reader.known")}</option><option value="ignored">{t("reader.ignored")}</option></select></article>)}</div></main>;
}

