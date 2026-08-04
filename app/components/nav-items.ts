import { AudioLines, BookOpenText, Languages, RotateCcw, Sprout } from "lucide-react";
import type { AppView } from "../types";
import type { StringKey } from "../i18n/strings";

/**
 * The five primary destinations, shared by the desktop bar and the bottom bar so
 * the two can never drift apart. Garden, My text and About live in the overflow
 * menu: the bottom bar holds five items and no more.
 */
export const NAV_ITEMS = [
  { view: "home", key: "nav.home", icon: Sprout },
  { view: "library", key: "nav.library", icon: BookOpenText },
  { view: "review", key: "nav.review", icon: RotateCcw },
  { view: "tones", key: "nav.tones", icon: AudioLines },
  { view: "words", key: "nav.words", icon: Languages },
] as const satisfies ReadonlyArray<{ view: AppView; key: StringKey; icon: typeof Sprout }>;
