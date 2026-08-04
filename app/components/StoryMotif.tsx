import type { StoryPattern } from "../types";

/** Decorative illustration on a reading card. Purely a CSS composition. */
export function StoryMotif({ pattern }: { pattern: StoryPattern }) {
  return (
    <div className={"story-motif story-motif--" + pattern} aria-hidden="true">
      <span className="motif-sun" />
      <span className="motif-hill motif-hill--back" />
      <span className="motif-hill motif-hill--front" />
      <span className="motif-animal">
        <span />
      </span>
      <span className="motif-grass motif-grass--one" />
      <span className="motif-grass motif-grass--two" />
    </div>
  );
}
