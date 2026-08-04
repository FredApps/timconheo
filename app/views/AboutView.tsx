import { BookOpenText, Languages, Sparkles, Sprout } from "lucide-react";
import { T, useT } from "../i18n";
import { PigMark } from "../components/PigMark";
import { APP_VERSION } from "../version";

export default function AboutView() {
  const t = useT();
  return (
    <main className="page feature-page about-page">
      <section className="about-hero">
        <PigMark />
        <T as="p" k="app.title" className="eyebrow" />
        <T as="h1" k="about.title" />
        <T as="p" k="about.body" />
      </section>

      <div className="about-grid">
        <article className="paper-card">
          <Sprout size={22} aria-hidden="true" />
          <T as="h2" k="about.noPressure" />
          <T as="p" k="about.noPressureBody" />
        </article>
        <article className="paper-card">
          <Languages size={22} aria-hidden="true" />
          <T as="h2" k="about.honest" />
          <T as="p" k="about.honestBody" />
        </article>
        <article className="paper-card">
          <Sparkles size={22} aria-hidden="true" />
          <T as="h2" k="about.classifiers" />
          <T as="p" k="about.classifiersBody" />
        </article>
        <article className="paper-card">
          <BookOpenText size={22} aria-hidden="true" />
          <T as="h2" k="about.open" />
          <T as="p" k="about.openBody" />
        </article>
      </div>

      <p className="approx-note">
        <T k="speech.about" />
      </p>
      <p className="build-note">{t("about.version", { version: APP_VERSION })} · GPL-3.0-only</p>
    </main>
  );
}
