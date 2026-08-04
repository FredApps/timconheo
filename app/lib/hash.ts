import type { AppView } from "../types";

const VIEWS: AppView[] = ["home", "library", "review", "tones", "garden", "words", "import", "about"];

export function parseHash(hash: string): { view: AppView; storyId?: string } {
  const value = decodeURIComponent(hash.replace(/^#/, ""));
  if (value.startsWith("read/")) return { view: "reader", storyId: value.slice(5) };
  return VIEWS.includes(value as AppView) ? { view: value as AppView } : { view: "home" };
}

export function viewHash(view: AppView): string {
  return `#${view}`;
}
