import { expect, test } from "vitest";
import {
  importStats,
  segmentImport,
  splitSentences,
  storyFromImport,
  stripPunctuation,
} from "../../app/lib/imports";

test("longest-match segmentation keeps a compound together", () => {
  // The pairwise matching this replaced split "buổi sáng" apart whenever the
  // second syllable began a compound of its own.
  expect(segmentImport("Buổi sáng tôi đi bộ")).toEqual(["Buổi sáng", "tôi", "đi bộ"]);
  expect(segmentImport("tiếng Việt rất hay")).toEqual(["tiếng Việt", "rất", "hay"]);
});

test("segmentation survives punctuation on the compound", () => {
  expect(segmentImport("Buổi sáng, tôi đi.")).toEqual(["Buổi sáng,", "tôi", "đi."]);
});

test("a syllable that is not part of any compound stands alone", () => {
  expect(segmentImport("mưa gió")).toEqual(["mưa", "gió"]);
  expect(segmentImport("")).toEqual([]);
});

test("punctuation stripping handles both ends", () => {
  expect(stripPunctuation('"Mời bạn."')).toBe("Mời bạn");
  expect(stripPunctuation("(Hội An)")).toBe("Hội An");
  expect(stripPunctuation("bình thường")).toBe("bình thường");
});

test("sentences split on terminators and on line breaks", () => {
  expect(splitSentences("Tôi đi. Bạn ở nhà! Sao?")).toEqual(["Tôi đi.", "Bạn ở nhà!", "Sao?"]);
  // Pasted verse has no full stops; a line is still a line.
  expect(splitSentences("Bầu ơi thương lấy bí cùng\nTuy rằng khác giống")).toEqual([
    "Bầu ơi thương lấy bí cùng",
    "Tuy rằng khác giống",
  ]);
  expect(splitSentences("   ")).toEqual([]);
});

test("import statistics count segmented words, not raw syllables", () => {
  const stats = importStats("Buổi sáng tôi đi bộ.\nTôi ăn cơm.");
  expect(stats.sentences).toBe(2);
  // "Buổi sáng" and "đi bộ" are each one word, so five syllables become three.
  expect(stats.words).toBe(3 + 3);
});

test("a saved import becomes a story the reader can open", () => {
  const story = storyFromImport({
    id: 7,
    title: "Sông Hàn",
    raw: "Buổi sáng tôi đi bộ.\nGió từ biển thổi vào.",
    importedAt: 0,
    difficulty: 3,
  });
  expect(story.id).toBe("import-7");
  expect(story.kind).toBe("import");
  expect(story.license).toBe("user");
  expect(story.sentences).toHaveLength(2);
  // Sentence ids must be stable and unique, because review context looks cards
  // up by them.
  expect(story.sentences.map((sentence) => sentence.id)).toEqual(["import-7-1", "import-7-2"]);
  expect(story.sentences[0].tokens.map((token) => token.text).join(" ")).toBe("Buổi sáng tôi đi bộ.");
});

test("an import with no sentence terminator still produces one readable line", () => {
  const story = storyFromImport({ id: 1, title: "x", raw: "mưa gió", importedAt: 0, difficulty: 0 });
  expect(story.sentences).toHaveLength(1);
  expect(story.sentences[0].tokens).toHaveLength(2);
});
