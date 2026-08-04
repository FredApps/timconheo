import { CloudOff, Loader2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { T, useT } from "../i18n";
import type { StringKey } from "../i18n/strings";
import { PigMark } from "./PigMark";

/** Inline, recoverable failure. Never replaces the content it belongs to. */
export function ErrorNote({ messageKey, onRetry }: { messageKey: StringKey; onRetry?: () => void }) {
  return (
    <p className="inline-error" role="alert">
      <TriangleAlert size={16} aria-hidden="true" />
      <T k={messageKey} />
      {onRetry && (
        <button type="button" className="link-button" onClick={onRetry}>
          <T k="state.retry" />
        </button>
      )}
    </p>
  );
}

export function Spinner({ labelKey = "state.loading" }: { labelKey?: StringKey }) {
  const t = useT();
  return (
    <p className="loading-note" role="status" aria-live="polite">
      <Loader2 size={16} className="spin" aria-hidden="true" />
      {t(labelKey)}
    </p>
  );
}

/**
 * A button that shows its own busy state and keeps its label, so the page does
 * not jump and a screen reader is told what is happening.
 */
export function AsyncButton({
  onClick,
  busy,
  disabled,
  className = "primary-button",
  busyLabelKey,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
  className?: string;
  busyLabelKey?: StringKey;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={busy || disabled}
      aria-busy={busy}
    >
      {busy ? (
        <>
          <Loader2 size={17} className="spin" aria-hidden="true" />
          {busyLabelKey ? <T k={busyLabelKey} /> : <T k="state.saving" />}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Shown when the server cannot be reached. Deliberately not the sign-in screen:
 * a dropped connection is not a sign-out, and saying so stops the app from
 * looking like it threw away someone's work.
 */
export function ConnectionScreen({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  return (
    <main className="page login-page">
      <section className="login-card paper-card connection-card">
        <PigMark />
        <CloudOff size={22} aria-hidden="true" />
        <T as="h1" k="state.offlineTitle" />
        <T as="p" k="state.offlineBody" className="login-intro" />
        <AsyncButton onClick={onRetry} busy={busy} busyLabelKey="state.loading">
          <T k="state.retry" />
        </AsyncButton>
      </section>
    </main>
  );
}
