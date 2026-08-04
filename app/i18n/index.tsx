import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { STRINGS, type StringKey } from "./strings";
import type { Bi } from "../types";

export type LangMode = "bilingual" | "english" | "vietnamese";

const STORAGE_KEY = "tch-lang";

export type Slots = Record<string, string | number>;

interface LangContextValue {
  mode: LangMode;
  setMode: (mode: LangMode) => void;
  /** A single-language string, for aria-label, title, placeholder and toasts. */
  t: (key: StringKey, slots?: Slots) => string;
  /** The primary language's half of a content pair. */
  bi: (value: Bi) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

function fill(template: string, slots?: Slots): string {
  if (!slots) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in slots ? String(slots[name]) : match,
  );
}

function initialMode(): LangMode {
  if (typeof window === "undefined") return "bilingual";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "english" || value === "vietnamese" || value === "bilingual" ? value : "bilingual";
}

/**
 * The chosen language lives in localStorage rather than on the server, because
 * the sign-in screen and the loading splash both render before any authenticated
 * call resolves. A server-stored preference would give a flash of the wrong
 * language on every cold start -- on precisely the screen where someone with no
 * Vietnamese is most stuck.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<LangMode>(initialMode);

  const setMode = useCallback((next: LangMode) => {
    setModeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = mode === "vietnamese" ? "vi" : "en";
    document.documentElement.dataset.lang = mode;
  }, [mode]);

  const value = useMemo<LangContextValue>(
    () => ({
      mode,
      setMode,
      t: (key, slots) => fill(mode === "vietnamese" ? STRINGS[key].vi : STRINGS[key].en, slots),
      bi: (pair) => (mode === "vietnamese" ? pair.vi : pair.en),
    }),
    [mode, setMode],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const value = useContext(LangContext);
  if (!value) throw new Error("useLang must be used inside LangProvider");
  return value;
}

export function useT(): LangContextValue["t"] {
  return useLang().t;
}

type Element = "span" | "strong" | "small" | "p" | "h1" | "h2" | "h3" | "div" | "li";

/**
 * Visible chrome. In bilingual mode this renders the English label with the
 * Vietnamese beneath it, so the interface itself is passive exposure.
 *
 * The secondary line is always `aria-hidden`: without that, every control
 * announces itself twice, in two languages, to a screen reader.
 */
export function T({
  k,
  slots,
  className,
  as = "span",
}: {
  k: StringKey;
  slots?: Slots;
  className?: string;
  as?: Element;
}) {
  const { mode } = useLang();
  const pair = STRINGS[k];
  const primary = fill(mode === "vietnamese" ? pair.vi : pair.en, slots);
  const secondary =
    mode === "bilingual" ? (
      <span className="bi-secondary" lang="vi" aria-hidden="true">
        {fill(pair.vi, slots)}
      </span>
    ) : null;
  const Tag = as;
  return (
    <Tag className={secondary ? `bi ${className ?? ""}`.trim() : className}>
      {primary}
      {secondary}
    </Tag>
  );
}

/** The same treatment for a content pair that travels with the data. */
export function BiText({ value, className, lang = "vi" }: { value: Bi; className?: string; lang?: string }) {
  const { mode } = useLang();
  const primary = mode === "vietnamese" ? value.vi : value.en;
  if (mode !== "bilingual") {
    return (
      <span className={className} lang={mode === "vietnamese" ? lang : "en"}>
        {primary}
      </span>
    );
  }
  return (
    <span className={`bi ${className ?? ""}`.trim()}>
      <span lang="en">{primary}</span>
      <span className="bi-secondary" lang={lang} aria-hidden="true">
        {value.vi}
      </span>
    </span>
  );
}
