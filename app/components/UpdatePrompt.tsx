import { useEffect, useState } from "react";
import { BiText } from "../i18n";
import { V07_TEXT } from "../i18n/content";

export function UpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) setWaiting(registration.waiting);
      registration.addEventListener("updatefound", () => {
        registration.installing?.addEventListener("statechange", () => {
          if (registration.waiting) setWaiting(registration.waiting);
        });
      });
    });
  }, []);
  if (!waiting) return null;
  return (
    <aside className="update-prompt" role="status">
      <span aria-hidden="true">🏮</span>
      <span>
        <strong>
          <BiText value={V07_TEXT.update} />
        </strong>
        <small>
          <BiText value={V07_TEXT.updateBody} />
        </small>
      </span>
      <button
        type="button"
        onClick={() => {
          waiting.postMessage({ type: "SKIP_WAITING" });
          window.location.reload();
        }}
      >
        <BiText value={V07_TEXT.updateAction} />
      </button>
    </aside>
  );
}
