import { useId, useMemo, useState } from "react";
import { Check, CloudDownload, Info, Upload, Volume2 } from "lucide-react";
import type { ImportRecord } from "../lib/api";
import { api } from "../lib/api";
import type { Story } from "../types";
import { LIMITS } from "../../shared/validation";
import { T, useT } from "../i18n";
import { BiText } from "../i18n";
import { V07_TEXT } from "../i18n/content";
import { useAsyncAction } from "../lib/async";
import { estimateStory } from "../lib/difficulty";
import { importStats, segmentImport, splitSentences, storyFromImport } from "../lib/imports";
import { useSpeech } from "../lib/speech";
import { AsyncButton, ErrorNote } from "../components/feedback";
import { PigMark } from "../components/PigMark";
import { Pill } from "../components/Pill";

export default function ImportView({
  imports,
  onSaved,
  onOpen,
}: {
  imports: ImportRecord[];
  onSaved: () => Promise<void>;
  onOpen: (story: Story) => void;
}) {
  const t = useT();
  const { speak } = useSpeech();
  const titleId = useId();
  const textId = useId();
  const counterId = useId();

  const [title, setTitle] = useState("");
  const [raw, setRaw] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(
    () => localStorage.getItem("tch-import-privacy-v1") === "accepted",
  );

  const stats = useMemo(() => importStats(raw), [raw]);
  const preview = useMemo(
    () => splitSentences(raw).map((line) => ({ line, tokens: segmentImport(line) })),
    [raw],
  );
  const estimate = useMemo(
    () =>
      estimateStory(
        storyFromImport({ id: 0, title: title || "Your text", raw, importedAt: 0, difficulty: 0 }),
        {},
        false,
      ),
    [raw, title],
  );

  const tooLong = raw.length > LIMITS.importText;

  const save = useAsyncAction(async () => {
    await api.addImport(title.trim() || "My Vietnamese text", raw.trim(), estimate.score);
    await onSaved();
    setRaw("");
    setTitle("");
  });

  const remove = useAsyncAction(async (id: number | string) => {
    await api.deleteImport(id);
    await onSaved();
    setConfirmDelete(null);
  });

  return (
    <main className="page feature-page import-page">
      <section className="feature-heading">
        <div>
          <T as="p" k="nav.import" className="eyebrow" />
          <T as="h1" k="import.title" />
          <T as="p" k="import.intro" />
        </div>
        <div className="local-only">
          <CloudDownload size={20} aria-hidden="true" />
          <T k="import.private" as="span" />
        </div>
      </section>

      <section className="import-workspace">
        <div className="import-form paper-card">
          <label htmlFor={titleId}>
            <T k="import.titleLabel" />
          </label>
          <input
            id={titleId}
            value={title}
            maxLength={LIMITS.importTitle}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("import.titlePlaceholder")}
          />

          <label htmlFor={textId}>
            <T k="import.textLabel" />
          </label>
          <textarea
            id={textId}
            value={raw}
            rows={10}
            aria-describedby={counterId}
            aria-invalid={tooLong}
            onChange={(event) => setRaw(event.target.value)}
            placeholder={t("import.textPlaceholder")}
          />
          <p id={counterId} className={"char-counter" + (tooLong ? " over" : "")}>
            {t("import.counter", { used: raw.length, max: LIMITS.importText })}
          </p>
          {tooLong && <ErrorNote messageKey="import.tooLong" />}

          <label className="privacy-consent">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(event) => {
                setPrivacyAccepted(event.target.checked);
                if (event.target.checked) localStorage.setItem("tch-import-privacy-v1", "accepted");
                else localStorage.removeItem("tch-import-privacy-v1");
              }}
            />
            <span>
              <strong>
                <BiText value={V07_TEXT.privacyUnderstand} />
              </strong>
              <small>
                <BiText value={V07_TEXT.privacyImportBody} />
              </small>
            </span>
          </label>

          <div className="import-form-bottom">
            <span className="soft-label">
              {t("import.stats", { words: stats.words, sentences: stats.sentences })}
            </span>
            <AsyncButton
              busy={save.busy}
              busyLabelKey="import.saving"
              disabled={!raw.trim() || tooLong || !privacyAccepted}
              onClick={() => void save.run()}
            >
              <Upload size={17} aria-hidden="true" />
              <T k="import.save" />
            </AsyncButton>
          </div>
          {save.status === "done" && (
            <p className="save-confirm" role="status">
              <Check size={16} aria-hidden="true" />
              <T k="import.saved" />
            </p>
          )}
          {save.errorKey && <ErrorNote messageKey={save.errorKey} />}
        </div>

        <div className="import-preview paper-card">
          <div className="preview-title">
            <T as="h2" k="import.preview" />
            <Pill tone="ochre">{estimate.score}/10</Pill>
          </div>

          {preview.length ? (
            <div className="preview-sentences" lang="vi">
              {preview.map(({ line, tokens }, lineIndex) => (
                <p key={`${lineIndex}:${line.slice(0, 24)}`} className="preview-tokens">
                  {tokens.map((token, position) => (
                    <button
                      key={`${lineIndex}:${position}`}
                      type="button"
                      onClick={() => void speak(token).catch(() => undefined)}
                      aria-label={t("reader.listenWord", { word: token })}
                    >
                      {token}
                    </button>
                  ))}
                </p>
              ))}
            </div>
          ) : (
            <div className="preview-empty">
              <PigMark />
              <T as="p" k="import.previewEmpty" />
            </div>
          )}

          <p className="approx-note">
            <Info size={15} aria-hidden="true" />
            <T k="import.approxNote" />
          </p>
          <p className="approx-note">
            <Volume2 size={15} aria-hidden="true" />
            <T k="import.audioNote" />
          </p>
        </div>
      </section>

      {imports.length > 0 && (
        <section className="saved-imports">
          <T as="h2" k="import.savedList" />
          {imports.map((item) => (
            <article key={item.id} className="paper-card">
              <div>
                <strong lang="vi">{item.title}</strong>
                <p lang="vi">
                  {item.raw.slice(0, 100)}
                  {item.raw.length > 100 ? "…" : ""}
                </p>
              </div>
              <div className="saved-actions">
                <Pill>{item.difficulty}/10</Pill>
                <button type="button" className="text-button" onClick={() => onOpen(storyFromImport(item))}>
                  <T k="import.open" />
                </button>
                {confirmDelete === item.id ? (
                  // Inline confirmation rather than a window.confirm: it keeps the
                  // title of what is about to go in front of the person deleting it.
                  <span className="confirm-inline" role="group">
                    <span>{t("import.deleteConfirm", { title: item.title })}</span>
                    <AsyncButton
                      className="text-button danger"
                      busy={remove.busy}
                      busyLabelKey="import.deleting"
                      onClick={() => void remove.run(item.id)}
                    >
                      <T k="import.deleteYes" />
                    </AsyncButton>
                    <button type="button" className="text-button" onClick={() => setConfirmDelete(null)}>
                      <T k="import.deleteNo" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      remove.reset();
                      setConfirmDelete(item.id);
                    }}
                  >
                    <T k="import.delete" />
                  </button>
                )}
              </div>
              {confirmDelete === item.id && remove.errorKey && <ErrorNote messageKey={remove.errorKey} />}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
