import freq from "../data/freq-core.json";
import type { Story, WordStatus } from "../types";
export type DifficultyBand = "gentle" | "steady" | "stretch" | "hard";
export interface DifficultyBreakdown { score: number; band: DifficultyBand; meanSentenceSyllables: number; rareRatio: number; hvDensity: number; typeTokenRatio: number; polysyllableRatio: number; clauseLinkerRatio: number; }
export interface StoryEstimate extends DifficultyBreakdown { story: Story; unknownRatio: number; minutes: number; readinessDistance: number; completed: boolean; }
const RARE_WEIGHT = 0.28;
const FREQ_WORDS = new Set((freq.words as string[]).map(normalizeVi));
export const FREQ_PROVENANCE = freq.provenance;
export function normalizeVi(value: string): string { return value.normalize("NFC").toLocaleLowerCase("vi"); }
function syllableCount(value: string): number { return value.trim().split(/\s+/).filter(Boolean).length; }
function tokensFor(story: Story): string[] { return story.sentences.flatMap((sentence) => sentence.tokens.map((token) => token.entry ?? token.text)); }
export function difficultyBreakdown(story: Story): DifficultyBreakdown {
  const tokens = tokensFor(story); const total = Math.max(tokens.length, 1); const unique = new Set(tokens.map(normalizeVi));
  const rare = tokens.filter((token) => !FREQ_WORDS.has(normalizeVi(token))).length / total;
  const sizes = story.sentences.map((sentence) => sentence.tokens.reduce((sum, token) => sum + syllableCount(token.text), 0));
  const meanSentenceSyllables = sizes.reduce((a, b) => a + b, 0) / Math.max(sizes.length, 1);
  const hvDensity = tokens.filter((token) => /[ảãạằắẳẵặầấẩẫậ]/i.test(token)).length / total;
  const typeTokenRatio = unique.size / total; const polysyllableRatio = tokens.filter((token) => syllableCount(token) > 1).length / total;
  const clauseLinkerRatio = tokens.filter((token) => ["và", "nhưng", "vì", "đã", "chưa"].includes(normalizeVi(token))).length / total;
  const raw = 1.2 + meanSentenceSyllables * 0.13 + rare * 10 * RARE_WEIGHT + (1 - typeTokenRatio) * 1.2 + polysyllableRatio * 1.4 + clauseLinkerRatio * 1.1 + hvDensity * 0.3;
  const score = Math.max(1, Math.min(10, Math.round(raw * 10) / 10));
  return { score, band: bandFor(score), meanSentenceSyllables, rareRatio: rare, hvDensity, typeTokenRatio, polysyllableRatio, clauseLinkerRatio };
}
export function bandFor(score: number): DifficultyBand { return score < 3 ? "gentle" : score < 5 ? "steady" : score < 7 ? "stretch" : "hard"; }
export function personalUnknownRatio(story: Story, statuses: Record<string, WordStatus>): number {
  const tokens = tokensFor(story); if (!tokens.length) return 0; const weights: Record<WordStatus, number> = { known: 0, ignored: 0, learning: 0.5, new: 1 };
  return tokens.reduce((sum, entry) => sum + weights[statuses[normalizeVi(entry)] ?? "new"], 0) / tokens.length;
}
export function estimateStory(story: Story, statuses: Record<string, WordStatus>, completed = false): StoryEstimate {
  const breakdown = difficultyBreakdown(story); const tokens = tokensFor(story); const trackedWords = Object.keys(statuses).length; const confidence = Math.min(1, trackedWords / 40);
  const unknownRatio = 0.18 * (1 - confidence) + personalUnknownRatio(story, statuses) * confidence;
  const minutes = Math.max(1, Math.ceil(tokens.reduce((sum, token) => sum + syllableCount(token), 0) / 55));
  return { ...breakdown, story, unknownRatio, minutes, readinessDistance: Math.abs(unknownRatio - 0.06) * (unknownRatio > 0.06 ? 1.6 : 1), completed };
}
export function rankStories(stories: Story[], statuses: Record<string, WordStatus>, completedIds: string[]): StoryEstimate[] {
  return stories.map((story) => estimateStory(story, statuses, completedIds.includes(story.id))).sort((a, b) => Number(a.completed) - Number(b.completed) || a.story.tier - b.story.tier || a.readinessDistance - b.readinessDistance || a.minutes - b.minutes || a.story.id.localeCompare(b.story.id));
}
