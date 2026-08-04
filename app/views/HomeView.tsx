import { BookOpenText, Check, ChevronRight, CloudDownload, Ear, Play } from "lucide-react";
import type { AppView, Story } from "../types";
import type { StoryEstimate } from "../lib/difficulty";
import type { LearnerStats } from "../lib/stats";
import { BiText, T, useT } from "../i18n";
import { KIND_LABELS } from "../i18n/content";
import { PigMark } from "../components/PigMark";
import { Pill } from "../components/Pill";
import { StoryMotif } from "../components/StoryMotif";
import { UnknownLabel } from "./shared/UnknownLabel";

export default function HomeView({
  ranked,
  stats,
  completedStories,
  onRead,
  onNavigate,
}: {
  ranked: StoryEstimate[];
  stats: LearnerStats;
  completedStories: string[];
  onRead: (story: Story) => void;
  onNavigate: (view: AppView) => void;
}) {
  const t = useT();
  const featured = ranked[0];
  if (!featured) return null;
  const measured = !featured.unknownIsUnmeasured;

  return (
    <main className="page home-page">
      <section className="welcome-row">
        <div>
          <T as="p" k="home.eyebrow" className="eyebrow" />
          <T as="h1" k="home.greeting" />
          <T as="p" k="home.intro" />
        </div>
        <div className="welcome-pig">
          <PigMark />
          <span aria-hidden="true">oink!</span>
        </div>
      </section>

      <section className="continue-card paper-card">
        <StoryMotif pattern={featured.story.pattern} />
        <div className="continue-copy">
          <div className="card-topline">
            <Pill tone="red">
              <BiText value={KIND_LABELS[featured.story.kind]} />
            </Pill>
            <span className="soft-label">
              <UnknownLabel estimate={featured} /> · {t("library.minutes", { count: featured.minutes })}
            </span>
          </div>
          <h2 lang="vi">{featured.story.title}</h2>
          <p className="story-translation">{featured.story.titleEn}</p>
          <p>
            <BiText value={featured.story.description} />
          </p>
          <div className="continue-actions">
            <button type="button" className="primary-button" onClick={() => onRead(featured.story)}>
              <BookOpenText size={18} aria-hidden="true" />
              <T k={completedStories.includes(featured.story.id) ? "home.reread" : "home.start"} />
            </button>
            <span className="soft-label">
              <Check size={16} aria-hidden="true" />
              {t("home.sentences", { count: featured.story.sentences.length })}
            </span>
          </div>
        </div>
      </section>

      <section className="quiet-stats" aria-label={t("home.summary")}>
        <div>
          <strong>{stats.knownWords}</strong>
          <T k="home.known" as="span" />
        </div>
        <div>
          <strong>{stats.syllablesRead}</strong>
          <T k="home.syllables" as="span" />
        </div>
        <div>
          <strong>{stats.readingDays}</strong>
          <T k="home.readingDays" as="span" />
        </div>
        <div>
          <strong>{stats.storiesCompleted}</strong>
          <T k="home.storiesDone" as="span" />
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <T as="p" k="home.ready" className="eyebrow" />
            <T as="h2" k={measured ? "home.sorted" : "home.sortedUnmeasured"} />
          </div>
        </div>
        <div className="story-grid">
          {ranked.slice(1, 4).map((item) => (
            <article key={item.story.id} className="story-card paper-card">
              <StoryMotif pattern={item.story.pattern} />
              <div className="story-card-copy">
                <div className="card-topline">
                  <Pill>
                    <BiText value={KIND_LABELS[item.story.kind]} />
                  </Pill>
                  <span className="soft-label">
                    <UnknownLabel estimate={item} /> · {t("library.minutes", { count: item.minutes })}
                  </span>
                </div>
                <h3 lang="vi">{item.story.title}</h3>
                <p className="story-translation">{item.story.titleEn}</p>
                <p className="story-description">
                  <BiText value={item.story.description} />
                </p>
                <button type="button" className="text-button" onClick={() => onRead(item.story)}>
                  <T k="library.read" />
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-split">
        <article className="tone-teaser paper-card">
          <div>
            <T as="h2" k="home.toneTitle" />
            <T as="p" k="home.toneBody" />
          </div>
          <button type="button" className="secondary-button" onClick={() => onNavigate("tones")}>
            <Ear size={17} aria-hidden="true" />
            <T k="nav.tones" />
          </button>
        </article>
        <article className="review-teaser paper-card">
          <div>
            <T as="h2" k="home.reviewTitle" />
            <T as="p" k="home.reviewBody" />
          </div>
          <button type="button" className="secondary-button" onClick={() => onNavigate("review")}>
            <Play size={17} aria-hidden="true" />
            <T k="nav.review" />
          </button>
        </article>
      </section>

      <button type="button" className="import-banner" onClick={() => onNavigate("import")}>
        <CloudDownload size={20} aria-hidden="true" />
        <span>
          <T as="strong" k="home.importTitle" />
          <T as="small" k="home.importBody" />
        </span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </main>
  );
}
