import type { AppView } from "../types";
export function parseHash(hash: string): { view: AppView; storyId?: string } {
  const value = hash.replace(/^#/, ""); if (value.startsWith("read/")) return { view: "reader", storyId: value.slice(5) };
  const views: AppView[] = ["home", "library", "review", "tones", "garden", "words", "import", "about"];
  return views.includes(value as AppView) ? { view: value as AppView } : { view: "home" };
}

