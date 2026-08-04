// Barrel for the shipped corpus. Export-only: the data itself lives in
// app/data/stories/* and app/data/tones.ts.
import type { Story } from "./types";
import { STORIES } from "./data/stories";

export { STORIES };
export { CA_DAO_STORIES, CENTRAL_STORIES, DONG_DAO_STORIES, TIER0_STORIES } from "./data/stories";
export { TONES, type ToneEntry } from "./data/tones";

export function allStorySentences(stories: Story[] = STORIES) {
  return stories.flatMap((story) => story.sentences.map((sentence) => ({ story, sentence })));
}
