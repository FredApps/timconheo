import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { STRINGS, type StringKey } from "./strings";
import type { Bi } from "../types";
export type LangMode = "bilingual" | "english" | "vietnamese";
const STORAGE_KEY = "tch-lang";
type LangContextValue = { mode: LangMode; setMode: (mode: LangMode) => void; t: (key: StringKey) => string; bi: (value: Bi) => string };
const LangContext = createContext<LangContextValue | null>(null);
function initialMode(): LangMode { const value = window.localStorage.getItem(STORAGE_KEY); return value === "english" || value === "vietnamese" || value === "bilingual" ? value : "bilingual"; }
export function LangProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<LangMode>(initialMode);
  const setMode = (next: LangMode) => { setModeState(next); window.localStorage.setItem(STORAGE_KEY, next); };
  useEffect(() => { document.documentElement.lang = mode === "vietnamese" ? "vi" : "en"; document.documentElement.dataset.lang = mode; }, [mode]);
  const value = useMemo(() => ({ mode, setMode, t: (key: StringKey) => mode === "vietnamese" ? STRINGS[key].vi : STRINGS[key].en, bi: (value: Bi) => mode === "vietnamese" ? value.vi : value.en }), [mode]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
export function useLang(): LangContextValue { const value = useContext(LangContext); if (!value) throw new Error("useLang must be used inside LangProvider"); return value; }
export function useT() { return useLang().t; }
export function T({ k, className, as = "span" }: { k: StringKey; className?: string; as?: "span" | "strong" | "small" | "p" | "h2" | "h3" }) {
  const { mode } = useLang(); const pair = STRINGS[k]; const content = mode === "vietnamese" ? pair.vi : pair.en; const secondary = mode === "bilingual" ? <span className="bi-secondary" lang="vi" aria-hidden="true">{pair.vi}</span> : null;
  if (as === "strong") return <strong className={className}>{content}{secondary}</strong>; if (as === "small") return <small className={className}>{content}{secondary}</small>; if (as === "p") return <p className={className}>{content}{secondary}</p>; if (as === "h2") return <h2 className={className}>{content}{secondary}</h2>; if (as === "h3") return <h3 className={className}>{content}{secondary}</h3>; return <span className={className}>{content}{secondary}</span>;
}
export function BiText({ value, className, lang = "vi" }: { value: Bi; className?: string; lang?: string }) { const { mode } = useLang(); const content = mode === "vietnamese" ? value.vi : value.en; return <span className={className} lang={lang}><span>{content}</span>{mode === "bilingual" && <span className="bi-secondary" aria-hidden="true">{value.vi}</span>}</span>; }

