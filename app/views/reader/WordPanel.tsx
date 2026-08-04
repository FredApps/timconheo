import { useCallback, useRef } from "react";
import { Info, Leaf, Sparkles, Volume2, X } from "lucide-react";
import type { Token, WordStatus } from "../../types";
import { BiText, T, useT } from "../../i18n";
import { POS_LABELS, STATUS_KEYS } from "../../i18n/content";
import { AsyncButton, ErrorNote } from "../../components/feedback";
import { useAsyncAction } from "../../lib/async";
import { useDialog } from "../../lib/focus";
import { normalizeEntry } from "../../data/lexicon";
import { useSpeech } from "../../lib/speech";

const STATUSES: WordStatus[] = ["new", "learning", "known", "ignored"];

/**
 * Details for one tapped word.
 *
 * On a narrow screen this is a real modal dialog -- labelled, focus-contained,
 * dismissed by Escape, an outside click or the close button, and it hands focus
 * back to the word that opened it. On a wide screen the same markup sits beside
 * the text; the dialog semantics do no harm there and mean there is only one
 * component to reason about.
 */
export function WordPanel({
  token,
  sentenceId,
  statuses,
  onClose,
  onRemember,
  onStatus,
}: {
  token: Token;
  sentenceId: string;
  statuses: Record<string, WordStatus>;
  onClose: () => void;
  onRemember: (token: Token, sentenceId: string) => Promise<void>;
  onStatus: (entry: string, status: WordStatus) => Promise<void>;
}) {
  const t = useT();
  const { speak } = useSpeech();
  const panel = useRef<HTMLDivElement>(null);
  useDialog(panel, true, onClose);

  const save = useAsyncAction(async () => {
    await onRemember(token, sentenceId);
  });
  const setStatus = useAsyncAction(async (status: WordStatus) => {
    await onStatus(token.entry, status);
  });

  const current = statuses[normalizeEntry(token.entry)];
  const listen = useCallback(() => {
    void speak(token.entry).catch(() => undefined);
  }, [speak, token.entry]);

  return (
    <>
      <div className="panel-backdrop" aria-hidden="true" />
      {/* A div rather than an aside: `dialog` is not an allowed role on the
          complementary landmark that <aside> already carries. */}
      <div
        className="word-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("reader.wordDetails", { word: token.entry })}
        ref={panel}
      >
        <div className="panel-handle" aria-hidden="true" />
        <button type="button" className="panel-close" onClick={onClose} aria-label={t("nav.close")}>
          <X size={19} aria-hidden="true" />
        </button>

        <p className="eyebrow">
          {token.pos ? <BiText value={POS_LABELS[token.pos]} /> : <T k="reader.new" />}
        </p>
        <h2 lang="vi">{token.entry}</h2>

        {token.pronunciation && (
          <p className="pronunciation">
            <span lang="vi">/{token.pronunciation}/</span>
            <button type="button" onClick={listen} aria-label={t("reader.listenWord", { word: token.entry })}>
              <Volume2 size={16} aria-hidden="true" />
            </button>
          </p>
        )}

        <p className="definition">
          <BiText value={token.gloss} />
        </p>

        {token.detail && (
          <div className="word-note">
            <Info size={17} aria-hidden="true" />
            <p>
              <BiText value={token.detail} />
            </p>
          </div>
        )}

        {token.classifier && (
          <div className="word-note">
            <Sparkles size={17} aria-hidden="true" />
            <p>
              <T as="strong" k="reader.classifier" />
              <T as="span" k="reader.classifierBody" />
            </p>
          </div>
        )}

        {token.hanViet && (
          <div className="han-viet-card">
            <span>
              <T k="reader.hanViet" />
            </span>
            <strong lang="vi">{token.hanViet.character}</strong>
            <p>
              {token.hanViet.meaning} — {token.hanViet.family.join(", ")}
            </p>
          </div>
        )}

        {token.central && (
          <div className="central-card">
            <span>
              <T k="reader.centralNote" />
            </span>
            <strong>
              <BiText value={token.central} />
            </strong>
          </div>
        )}

        <div className="knownness-picker">
          <T as="span" k="reader.wordStatus" />
          <div role="group" aria-label={t("reader.wordStatus")}>
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={current === status ? "active" : ""}
                aria-pressed={current === status}
                disabled={setStatus.busy}
                onClick={() => void setStatus.run(status)}
              >
                <T k={STATUS_KEYS[status]} />
              </button>
            ))}
          </div>
          {setStatus.errorKey && <ErrorNote messageKey={setStatus.errorKey} />}
        </div>

        <AsyncButton
          className="primary-button panel-save"
          busy={save.busy}
          busyLabelKey="reader.remembering"
          onClick={() => {
            void save.run().then((ok) => {
              if (ok) onClose();
            });
          }}
        >
          <Leaf size={17} aria-hidden="true" />
          <T k="reader.remember" />
        </AsyncButton>
        {save.errorKey && <ErrorNote messageKey={save.errorKey} />}
      </div>
    </>
  );
}
