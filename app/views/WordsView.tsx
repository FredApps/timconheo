import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { WordRecord } from "../lib/api";
import type { WordStatus } from "../types";
import { T, useLang, useT } from "../i18n";
import { STATUS_KEYS } from "../i18n/content";
import { lookup } from "../data/lexicon";
import { PigMark } from "../components/PigMark";

type Filter = "all" | WordStatus;
type Sort = "recent" | "alpha" | "seen";

const FILTERS: Filter[] = ["all", "new", "learning", "known", "ignored"];

export default function WordsView({
  words,
  onStatus,
}: {
  words: WordRecord[];
  onStatus: (entry: string, status: WordStatus) => Promise<void>;
}) {
  const t = useT();
  const { bi } = useLang();
  const searchId = useId();
  const sortId = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi");
    const filtered = words.filter(
      (word) =>
        (filter === "all" || word.status === filter) &&
        (!needle ||
          word.entry.toLocaleLowerCase("vi").includes(needle) ||
          word.gloss.toLocaleLowerCase("vi").includes(needle)),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "alpha") return a.entry.localeCompare(b.entry, "vi");
      if (sort === "seen") return b.timesSeen - a.timesSeen || a.entry.localeCompare(b.entry, "vi");
      return b.updatedAt - a.updatedAt;
    });
  }, [filter, query, sort, words]);

  return (
    <main className="page feature-page words-page">
      <section className="feature-heading">
        <div>
          <T as="p" k="nav.words" className="eyebrow" />
          <T as="h1" k="words.title" />
          <T as="p" k="words.intro" />
        </div>
        <p className="soft-label">{t("words.count", { count: visible.length, total: words.length })}</p>
      </section>

      <div className="word-controls">
        <label className="search-field" htmlFor={searchId}>
          <Search size={18} aria-hidden="true" />
          <span className="visually-hidden">{t("words.search")}</span>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("words.search")}
          />
        </label>

        <div className="filter-row" role="group" aria-label={t("words.filter")}>
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "active" : ""}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "all" ? t("words.all") : t(STATUS_KEYS[value])}
            </button>
          ))}
        </div>

        <label htmlFor={sortId} className="control-label">
          <T k="words.sort" />
        </label>
        <select id={sortId} value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
          <option value="recent">{t("words.sortRecent")}</option>
          <option value="alpha">{t("words.sortAlpha")}</option>
          <option value="seen">{t("words.sortSeen")}</option>
        </select>
      </div>

      <div className="word-list paper-card">
        {visible.length === 0 &&
          (words.length === 0 ? (
            <div className="empty-words">
              <PigMark />
              <T as="h2" k="words.empty" />
              <T as="p" k="words.emptyBody" />
            </div>
          ) : (
            <p className="empty-note">
              <T k="words.noMatch" />
            </p>
          ))}

        {/* A list, not a run of headings: these entries are siblings in a
            collection, and heading levels are for document structure. */}
        {visible.length > 0 && (
          <ul>
            {visible.map((word) => {
              // A word saved before the lexicon knew it still gets the shipped
              // bilingual gloss, rather than whatever English was stored that day.
              const known = lookup(word.entry);
              return (
                <li key={word.entry}>
                  <span className={"status-seed status-seed--" + word.status} aria-hidden="true" />
                  <div>
                    <strong className="word-entry" lang="vi">
                      {word.entry}
                    </strong>
                    <p>{known ? bi(known.gloss) : word.gloss}</p>
                  </div>
                  <span className="seen-count">{t("words.timesSeen", { count: word.timesSeen })}</span>
                  <select
                    value={word.status}
                    onChange={(event) => void onStatus(word.entry, event.target.value as WordStatus)}
                    aria-label={t("words.statusOf", { entry: word.entry })}
                  >
                    {(["new", "learning", "known", "ignored"] as WordStatus[]).map((status) => (
                      <option key={status} value={status}>
                        {t(STATUS_KEYS[status])}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
