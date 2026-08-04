import { useT } from "../i18n";
import { NAV_ITEMS } from "./nav-items";
import type { AppView } from "../types";

/**
 * Bottom bar. Labels use `t()` rather than the bilingual `<T/>` pair: five
 * two-line items at nine pixels on a 360px phone is unreadable, and the same
 * label is already paired in the desktop bar and the menu.
 */
export function BottomNav({
  currentView,
  onNavigate,
}: {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}) {
  const t = useT();
  return (
    <nav className="bottom-nav" aria-label={t("nav.sections")}>
      {NAV_ITEMS.map(({ view, key, icon: Icon }) => {
        const current = currentView === view;
        return (
          <button
            key={view}
            type="button"
            className={current ? "active" : ""}
            aria-current={current ? "page" : undefined}
            onClick={() => onNavigate(view)}
          >
            <Icon size={20} strokeWidth={current ? 2.3 : 1.8} aria-hidden="true" />
            <span>{t(key)}</span>
          </button>
        );
      })}
    </nav>
  );
}
