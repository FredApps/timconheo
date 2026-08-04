import { COMMON_COMPOUNDS } from "../data/compounds";
import type { ImportRecord } from "../../shared/types";
import type { Sentence, Story } from "../types";

const MAX_COMPOUND_SYLLABLES = Math.max(...COMMON_COMPOUNDS.map((compound) => compound.split(" ").length), 1);

/** Compounds indexed by their normalised form so lookup is a hash, not a scan. */
const COMPOUND_SET = new Set(COMMON_COMPOUNDS.map((value) => value.normalize("NFC").toLocaleLowerCase("vi")));

const TRAILING = /[.,!?;:…"'”’)\]]+$/u;
const LEADING = /^["'“‘([]+/u;

export function stripPunctuation(value: string): string {
  return value.replace(LEADING, "").replace(TRAILING, "");
}

function isCompound(candidate: string): boolean {
  return COMPOUND_SET.has(stripPunctuation(candidate).normalize("NFC").toLocaleLowerCase("vi"));
}

/**
 * Longest-match segmentation.
 *
 * Vietnamese writes syllables separately, so a naive split calls "buổi sáng" two
 * words. Trying the longest compound first and falling back one syllable at a
 * time is the standard greedy approach: cheap, and right far more often than the
 * pairwise matching this replaced, which took "buổi sáng" apart whenever "sáng"
 * happened to begin a compound of its own.
 *
 * It is an approximation, and the interface says so.
 */
export function segmentImport(raw: string): string[] {
  const syllables = raw.trim().split(/\s+/).filter(Boolean);
  const result: string[] = [];
  let index = 0;
  while (index < syllables.length) {
    let taken = 1;
    const reach = Math.min(MAX_COMPOUND_SYLLABLES, syllables.length - index);
    for (let length = reach; length > 1; length -= 1) {
      if (isCompound(syllables.slice(index, index + length).join(" "))) {
        taken = length;
        break;
      }
    }
    result.push(syllables.slice(index, index + taken).join(" "));
    index += taken;
  }
  return result;
}

/**
 * Split running text into sentences.
 *
 * Keeps the terminator with the sentence it ends, and treats a line break as a
 * boundary so pasted verse becomes one line per line rather than one long
 * paragraph.
 */
export function splitSentences(raw: string): string[] {
  return raw
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/(?<=[.!?…])\s+/))
    .map((part) => part.trim())
    .filter(Boolean);
}

export function importStats(raw: string): { words: number; sentences: number } {
  const sentences = splitSentences(raw);
  return {
    words: sentences.reduce((sum, sentence) => sum + segmentImport(sentence).length, 0),
    sentences: sentences.length,
  };
}

/**
 * A saved import rendered as a `Story`, so the reader, the difficulty estimate
 * and the review context line all work on it unchanged.
 */
export function storyFromImport(record: ImportRecord): Story {
  const lines = splitSentences(record.raw);
  const sentences: Sentence[] = (lines.length ? lines : [record.raw]).map((line, index) => ({
    id: `import-${record.id}-${index + 1}`,
    translation: { en: line, vi: line },
    tokens: segmentImport(line).map((text) => ({ text })),
  }));

  return {
    id: `import-${record.id}`,
    title: record.title,
    titleEn: record.title,
    tier: 1,
    kind: "import",
    region: "national",
    description: {
      en: "A text from your account.",
      vi: "Một văn bản từ tài khoản của bạn.",
    },
    source: "Your account",
    license: "user",
    pattern: "sprout",
    sentences,
  };
}
