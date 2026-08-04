import { BookOpenText, Leaf } from "lucide-react";
import { T, useT } from "../i18n";
import type { LearnerStats } from "../lib/stats";
import { PigMark } from "../components/PigMark";

const MAX_PLANTS = 24;

/** A trophy case, not a scoreboard. It records what grew and never takes it back. */
export default function GardenView({ stats }: { stats: LearnerStats }) {
  const t = useT();
  const plants = Math.min(stats.knownWords, MAX_PLANTS);

  return (
    <main className="page garden-page">
      <section className="feature-heading">
        <div>
          <T as="p" k="nav.garden" className="eyebrow" />
          <T as="h1" k="garden.title" />
          <T as="p" k="garden.intro" />
        </div>
        <div className="garden-total">
          <strong>{stats.knownWords}</strong>
          <T k="home.known" as="span" />
        </div>
      </section>

      {/* A div, because `img` is not an allowed role on a <section> landmark.
          The label is what a screen reader gets instead of the drawing. */}
      <div
        className="garden-scene paper-card"
        role="img"
        aria-label={t("garden.plants", { count: plants, total: stats.knownWords })}
      >
        <div className="garden-sun" />
        <div className="garden-hills" />
        <div className="garden-plants">
          {Array.from({ length: plants }, (_, index) => (
            <span key={index} className={"plant plant-" + ((index % 4) + 1)}>
              <i />
              <b />
            </span>
          ))}
        </div>
        <div className="garden-pig">
          <PigMark />
          <span className="pig-body" />
        </div>
        <div className="garden-ground" />
      </div>

      <div className="garden-notes">
        <article>
          <Leaf size={20} aria-hidden="true" />
          <div>
            <strong>{stats.knownWords}</strong>
            <T as="p" k="home.known" />
          </div>
        </article>
        <article>
          <BookOpenText size={20} aria-hidden="true" />
          <div>
            <strong>{stats.storiesCompleted}</strong>
            <T as="p" k="home.storiesDone" />
          </div>
        </article>
      </div>
    </main>
  );
}
