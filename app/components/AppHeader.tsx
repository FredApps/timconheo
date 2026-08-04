import { useCallback, useRef, useState } from "react";
import {
  AudioLines,
  Flower2,
  Info,
  Languages,
  LogOut,
  Menu,
  Moon,
  Settings2,
  Sun,
  Upload,
  X,
} from "lucide-react";
import type { User } from "../../shared/types";
import type { AppView, ThemeMode } from "../types";
import { T, useLang } from "../i18n";
import { usePopover } from "../lib/focus";
import { useSpeech } from "../lib/speech";
import { NAV_ITEMS } from "./nav-items";
import { PigMark } from "./PigMark";

const THEME_LABEL: Record<ThemeMode, "nav.themeLight" | "nav.themeDark" | "nav.themeSystem"> = {
  light: "nav.themeLight",
  dark: "nav.themeDark",
  system: "nav.themeSystem",
};

export function AppHeader({
  currentView,
  onNavigate,
  theme,
  onTheme,
  user,
  onSignOut,
}: {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  theme: ThemeMode;
  onTheme: () => void;
  user: User;
  onSignOut: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { mode, setMode, t } = useLang();
  const { voice, setVoice } = useSpeech();

  const close = useCallback(() => setMenuOpen(false), []);
  usePopover(menuRef, menuOpen, close);

  const go = (view: AppView) => {
    onNavigate(view);
    setMenuOpen(false);
  };

  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={() => onNavigate("home")}>
        <PigMark small />
        <span className="brand-name">
          <T k="app.title" />
        </span>
        <span className="brand-dialect">{t("app.dialect")}</span>
      </button>

      <nav className="desktop-nav" aria-label={t("nav.primary")}>
        {NAV_ITEMS.map(({ view, key }) => {
          const current = currentView === view;
          return (
            <button
              key={view}
              type="button"
              className={current ? "active" : ""}
              aria-current={current ? "page" : undefined}
              onClick={() => onNavigate(view)}
            >
              <T k={key} />
            </button>
          );
        })}
      </nav>

      <div className="topbar-actions" ref={menuRef}>
        <button type="button" className="icon-button" onClick={onTheme} aria-label={t(THEME_LABEL[theme])}>
          {theme === "light" ? (
            <Sun size={18} aria-hidden="true" />
          ) : theme === "dark" ? (
            <Moon size={18} aria-hidden="true" />
          ) : (
            <Settings2 size={18} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={onSignOut}
          aria-label={t("nav.signOutOf", { username: user.username })}
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-button menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? t("nav.menuClose") : t("nav.menuOpen")}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>

        {menuOpen && (
          <div className="overflow-menu" role="menu">
            <label>
              <Languages size={17} aria-hidden="true" />
              <span>{t("nav.language")}</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as typeof mode)}
                aria-label={t("nav.language")}
              >
                <option value="bilingual">{t("nav.languageBilingual")}</option>
                <option value="english">{t("nav.languageEnglish")}</option>
                <option value="vietnamese">{t("nav.languageVietnamese")}</option>
              </select>
            </label>
            <label>
              <AudioLines size={17} aria-hidden="true" />
              <span>{t("nav.voice")}</span>
              <select
                value={voice}
                onChange={(event) => setVoice(event.target.value as "myan" | "giahuy")}
                aria-label={t("nav.voice")}
              >
                <option value="myan">My An</option>
                <option value="giahuy">Gia Huy</option>
              </select>
            </label>
            <button type="button" role="menuitem" onClick={() => go("garden")}>
              <Flower2 size={17} aria-hidden="true" />
              <T k="nav.garden" />
            </button>
            <button type="button" role="menuitem" onClick={() => go("import")}>
              <Upload size={17} aria-hidden="true" />
              <T k="nav.import" />
            </button>
            <button type="button" role="menuitem" onClick={() => go("about")}>
              <Info size={17} aria-hidden="true" />
              <T k="nav.about" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
