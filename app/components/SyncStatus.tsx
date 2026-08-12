import { useEffect, useState } from "react";
import type { SyncStatus as SyncState } from "../../shared/types";
import { api } from "../lib/api";
import { currentSyncStatus, subscribeSync } from "../lib/offline";
import { BiText } from "../i18n";
import { V07_TEXT } from "../i18n/content";

export function SyncStatus() {
  const [status, setStatus] = useState<SyncState>(currentSyncStatus());
  useEffect(() => subscribeSync(setStatus), []);
  if (status.online && !status.syncing && status.pending === 0) return null;
  return (
    <aside className={`sync-status ${status.online ? "is-syncing" : "is-offline"}`} aria-live="polite">
      <span className="sync-pig" aria-hidden="true">
        {status.online ? "🐷" : "🐽"}
      </span>
      <span>
        <strong>
          <BiText
            value={status.syncing ? V07_TEXT.syncing : status.online ? V07_TEXT.waiting : V07_TEXT.offline}
          />
        </strong>
        <small>
          {status.pending ? (
            <>
              {status.pending} · <BiText value={V07_TEXT.offlineSafe} />
            </>
          ) : (
            <BiText value={V07_TEXT.offlineReady} />
          )}
        </small>
      </span>
      {status.pending > 0 && status.online && (
        <button type="button" onClick={() => void api.sync()} disabled={status.syncing}>
          <BiText value={V07_TEXT.retry} />
        </button>
      )}
    </aside>
  );
}
