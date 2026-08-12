import { useEffect, useState } from "react";
import { BookOpenText, Download, Languages, ShieldCheck, Sparkles, Sprout, Trash2 } from "lucide-react";
import type { DeviceSession } from "../../shared/types";
import { api } from "../lib/api";
import { BiText, T, useLang, useT } from "../i18n";
import { V07_TEXT } from "../i18n/content";
import type { Bi } from "../types";
import { PigMark } from "../components/PigMark";
import { APP_VERSION } from "../version";

export default function AboutView() {
  const t = useT();
  const { bi } = useLang();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<Bi | null>(null);
  useEffect(() => {
    void api
      .sessions()
      .then((value) => setSessions(value.sessions))
      .catch(() => undefined);
  }, []);

  const exportData = async () => {
    const data = await api.exportData();
    const href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `tim-con-heo-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(href);
    setNotice(V07_TEXT.exportDone);
  };
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

      <section className="paper-card privacy-center">
        <div>
          <ShieldCheck size={24} aria-hidden="true" />
          <h2>
            <BiText value={V07_TEXT.privacyTitle} />
          </h2>
          <p>
            <BiText value={V07_TEXT.privacyBody} />
          </p>
        </div>
        <div className="privacy-actions">
          <button type="button" onClick={() => void exportData()}>
            <Download size={17} /> <BiText value={V07_TEXT.export} />
          </button>
          <button
            type="button"
            onClick={() => void api.deleteAllImports().then(() => setNotice(V07_TEXT.importsDeleted))}
          >
            <Trash2 size={17} /> <BiText value={V07_TEXT.importsDeleteAll} />
          </button>
          <button type="button" onClick={() => void api.purgeDevice().then(() => window.location.reload())}>
            <BiText value={V07_TEXT.purgeDevice} />
          </button>
        </div>
        {sessions.length > 0 && (
          <div className="device-sessions">
            <h3>
              <BiText value={V07_TEXT.sessions} />
            </h3>
            {sessions.map((session) => (
              <div key={session.id}>
                <span>
                  {session.deviceName}
                  {session.current ? ` · ${bi(V07_TEXT.thisDevice)}` : ""}
                </span>
                {!session.current && (
                  <button
                    type="button"
                    onClick={() =>
                      void api
                        .revokeSession(session.id)
                        .then(() => setSessions((items) => items.filter((item) => item.id !== session.id)))
                    }
                  >
                    <BiText value={V07_TEXT.revoke} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="delete-account">
          <label htmlFor="delete-account-password">
            <BiText value={V07_TEXT.accountDelete} />
          </label>
          <input
            id="delete-account-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={bi(V07_TEXT.passwordConfirm)}
          />
          <button
            className="danger"
            type="button"
            disabled={password.length < 6}
            onClick={() =>
              void api
                .deleteAccount(password)
                .then(() => api.purgeDevice())
                .then(() => window.location.reload())
                .catch(() => setNotice(V07_TEXT.passwordFailed))
            }
          >
            <BiText value={V07_TEXT.accountDeleteAction} />
          </button>
        </div>
        {notice && (
          <p role="status" className="save-confirm">
            <BiText value={notice} />
          </p>
        )}
      </section>

      <p className="approx-note">
        <T k="speech.about" />
      </p>
      <p className="build-note">{t("about.version", { version: APP_VERSION })} · GPL-3.0-only</p>
    </main>
  );
}
