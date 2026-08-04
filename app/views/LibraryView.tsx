import { useId, useMemo, useState } from "react";
import type { Story } from "../types";
import type { StoryEstimate } from "../lib/difficulty";
import { BiText, T, useT } from "../i18n";
import { BAND_LABELS, KIND_LABELS, REGION_LABELS } from "../i18n/content";
import { Pill } from "../components/Pill";
import { StoryMotif } from "../components/StoryMotif";
import { UnknownLabel } from "./shared/UnknownLabel";

type SortKey = "readiness" | "difficulty" | "shortest";

export default function LibraryView({
  ranked,
  onRead,
}: {
  ranked: StoryEstimate[];
  onRead: (story: Story) => void;
}) {
  const t = useT();
  const sortId = useId();
  const [sort, setSort] = useState<SortKey>("readiness");
  const [tier, setTier] = useState<"all" | number>("all");

  const tiers = useMemo(
    () => [...new Set(ranked.map((item) => item.story.tier))].sort((a, b) => a - b),
    [ranked],
  );

  const items = useMemo(() => {
    const filtered = ranked.filter((item) => tier === "all" || item.story.tier === tier);
    // `ranked` already arrives in readiness order, so that case is a no-op.
    if (sort === "readiness") return filtered;
    return [...filtered].sort((a, b) =>
      sort === "difficulty" ? a.score - b.score : a.minutes - b.minutes || a.score - b.score,
    );
  }, [ranked, sort, tier]);

  return (
    <main className="page feature-page library-page">
      <section className="feature-heading">
        <div>
          <T as="p" k="nav.library" className="eyebrow" />
          <T as="h1" k="library.title" />
          <T as="p" k="library.intro" />
        </div>
        <p className="soft-label">{t("library.count", { count: items.length })}</p>
      </section>

      <div className="library-controls">
        <label htmlFor={sortId} className="control-label">
          <T k="library.sort" />
        </label>
        <select id={sortId} value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
          <option value="readiness">{t("library.sortReadiness")}</option>
          <option value="difficulty">{t("library.sortDifficulty")}</option>
          <option value="shortest">{t("library.sortShortest")}</option>
        </select>

        <div className="filter-row" role="group" aria-label={t("library.filterTier")}>
          <button
            type="button"
            className={tier === "all" ? "active" : ""}
            aria-pressed={tier === "all"}
            onClick={() => setTier("all")}
          >
            {t("library.filterAll")}
          </button>
          {tiers.map((value) => (
            <button
              key={value}
              type="button"
              className={tier === value ? "active" : ""}
              aria-pressed={tier === value}
              onClick={() => setTier(value)}
            >
              {t("library.tier", { tier: value })}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="empty-note">
          <T k="library.empty" />
        </p>
      ) : (
        <div className="story-list">
          {items.map((item) => (
            <article key={item.story.id} className="story-card paper-card">
              <StoryMotif pattern={item.story.pattern} />
              <div className="story-card-copy">
                <div className="card-topline">
                  <Pill>
                    <BiText value={KIND_LABELS[item.story.kind]} />
                  </Pill>
                  <span className={"difficulty-band band-" + item.band}>
                    <BiText value={BAND_LABELS[item.band]} />
                  </span>
                  {item.completed && (
                    <Pill tone="green">
                      <T k="library.completed" />
                    </Pill>
                  )}
                </div>
                <h2 lang="vi">{item.story.title}</h2>
                <p className="story-translation">{item.story.titleEn}</p>
                <p>
                  <BiText value={item.story.description} />
                </p>
                <div className="story-meta">
                  <span>
                    <UnknownLabel estimate={item} />
                  </span>
                  <span>{t("library.minutes", { count: item.minutes })}</span>
                  <span>
                    <BiText value={REGION_LABELS[item.story.region]} />
                  </span>
                </div>
                <details className="why-details">
                  <summary>{t("library.why")}</summary>
                  <p>
                    {t("library.whyBody", {
                      score: item.score,
                      rare: Math.round(item.rareRatio * 100),
                      syllables: item.meanSentenceSyllables.toFixed(1),
                    })}
                  </p>
                </details>
                <button type="button" className="primary-button" onClick={() => onRead(item.story)}>
                  <T k="library.read" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
