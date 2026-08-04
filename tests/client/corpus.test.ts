import { describe, expect, test } from "vitest";
import { STORIES } from "../../app/data";
import { LEXICON, normalizeEntry } from "../../app/data/lexicon";

const renderedLines = (storyId: string): string[] => {
  const story = STORIES.find((item) => item.id === storyId);
  if (!story) throw new Error(`missing story ${storyId}`);
  return story.sentences.map((sentence) => sentence.tokens.map((token) => token.text).join(" "));
};

const clean = (value: string) => value.trim().replace(/[.,!?;:…]+$/u, "");

test("the corpus is the size the documentation claims", () => {
  expect(STORIES).toHaveLength(12);
  expect(STORIES.reduce((n, story) => n + story.sentences.length, 0)).toBe(46);
});

test("displayed Vietnamese reconstructs every word of the recorded line", () => {
  for (const story of STORIES.filter((item) => !item.interactive)) {
    for (const sentence of story.sentences) {
      const displayed = sentence.tokens.map((token) => token.text).join(" ");
      expect(clean(displayed), `${story.id}/${sentence.id} is truncated`).toBe(
        clean(sentence.translation.vi),
      );
    }
  }
});

describe("source-line locks", () => {
  // Character-for-character. These are what stops an edit from quietly turning a
  // sourced reading into a variant nobody checked.
  const cases: Array<[string, string[]]> = [
    ["dong-dao-con-co-be-be", ["Con cò bé bé", "Nó đậu cành tre", "Đi không hỏi mẹ", "Biết đi đường nào"]],
    [
      "dong-dao-con-meo",
      [
        "Con mèo mà trèo cây cau",
        "Hỏi thăm chú chuột đi đâu vắng nhà",
        "Chú chuột đi chợ đường xa",
        "Mua mắm mua muối giỗ cha chú mèo",
      ],
    ],
    [
      "dong-dao-dung-dang",
      [
        "Dung dăng dung dẻ",
        "Dắt trẻ đi chơi",
        "Đến cửa nhà trời",
        "Lạy cậu lạy mợ",
        "Cho cháu về quê",
        "Cho dê đi học",
        "Cho cóc ở nhà",
        "Cho gà bới bếp",
        "Ngồi xệp xuống đây",
      ],
    ],
    [
      "dong-dao-keo-cua",
      ["Kéo cưa lừa xẻ", "Ông thợ nào khỏe", "Về ăn cơm vua", "Ông thợ nào thua", "Về bú tí mẹ"],
    ],
    ["ca-dao-bau-oi", ["Bầu ơi thương lấy bí cùng", "Tuy rằng khác giống nhưng chung một giàn"]],
    [
      "ca-dao-trau-oi",
      [
        "Trâu ơi ta bảo trâu này",
        "Trâu ra ngoài ruộng trâu cày với ta",
        "Cấy cày giữ nghiệp nông gia",
        "Ta đây trâu đấy, ai mà quản công",
        "Bao giờ cây lúa còn bông",
        "Thì còn ngọn cỏ ngoài đồng trâu ăn",
      ],
    ],
    ["ca-dao-dat-quang", ["Đất Quảng Nam chưa mưa đà thấm", "Rượu Hồng Đào chưa nhấm đà say"]],
    [
      "canh-buoi-sang-song-han",
      [
        "Buổi sáng, tôi đi bộ bên sông Hàn.",
        "Gió từ biển thổi vào thành phố.",
        "Tôi mua một ổ bánh mì và một ly cà phê.",
        'Người bán hàng mỉm cười và nói: "Mời bạn."',
        "Tôi ngồi nhìn cầu Rồng.",
      ],
    ],
    [
      "canh-cho-hoi-an",
      [
        "Buổi chiều, tôi đi chợ ở Hội An.",
        "Trong chợ có rau, cá và nhiều loại trái cây.",
        "Tôi hỏi giá một rổ xoài.",
        "Cô bán hàng trả lời rồi cân xoài cho tôi.",
        "Tôi cảm ơn cô và đi về bên dòng sông.",
      ],
    ],
  ];

  test.each(cases)("%s", (storyId, expected) => {
    expect(renderedLines(storyId)).toEqual(expected);
  });
});

test("every shipped string is NFC-normalised", () => {
  const check = (value: string, where: string) => {
    expect(value.normalize("NFC"), `${where} is not NFC-normalised`).toBe(value);
  };
  for (const story of STORIES) {
    check(story.title, `${story.id} title`);
    check(story.source, `${story.id} source`);
    check(story.description.vi, `${story.id} description`);
    for (const sentence of story.sentences) {
      check(sentence.translation.vi, `${story.id}/${sentence.id}`);
      for (const token of sentence.tokens) {
        check(token.text, `${story.id}/${sentence.id} token`);
        if (token.entry) check(token.entry, `${story.id}/${sentence.id} entry`);
      }
    }
  }
  for (const [entry, value] of Object.entries(LEXICON)) {
    check(entry, `lexicon key ${entry}`);
    check(value.gloss.vi, `lexicon gloss ${entry}`);
  }
});

test("story and sentence identifiers are unique", () => {
  const storyIds = STORIES.map((story) => story.id);
  expect(new Set(storyIds).size).toBe(storyIds.length);
  const sentenceIds = STORIES.flatMap((story) => story.sentences.map((sentence) => sentence.id));
  expect(new Set(sentenceIds).size).toBe(sentenceIds.length);
});

test("every word in a shipped reading has a real dictionary entry", () => {
  const missing = new Set<string>();
  for (const story of STORIES) {
    for (const sentence of story.sentences) {
      for (const token of sentence.tokens) {
        const entry = normalizeEntry(token.entry ?? token.text);
        if (!LEXICON[entry]) missing.add(`${story.id}: ${entry}`);
      }
    }
  }
  expect([...missing]).toEqual([]);
});

test("dictionary keys are already normalised, so every lookup can hit", () => {
  for (const entry of Object.keys(LEXICON)) {
    expect(normalizeEntry(entry), `${entry} is not a normalised key`).toBe(entry);
  }
});

test("rights metadata does not call the attributed song folklore", () => {
  const song = STORIES.find((story) => story.id === "dong-dao-con-co-be-be");
  expect(song?.license).toBe("copyrightedExcerpt");
  expect(song?.source).toMatch(/Lê Xuân Thọ/);
  for (const story of STORIES.filter((item) => item.license === "publicDomain")) {
    expect(story.sourceUrl, `${story.id} needs a verification URL`).toBeTruthy();
  }
});

test("original Central-set readings say they are learning material, not dialect transcriptions", () => {
  const scenes = STORIES.filter((story) => story.kind === "scene");
  expect(scenes.length).toBeGreaterThan(0);
  for (const story of scenes) {
    expect(story.attributionNote, `${story.id} needs an attribution note`).toBeTruthy();
    expect(story.attributionNote?.en).toMatch(/standard Vietnamese/i);
    expect(story.attributionNote?.vi).toMatch(/tiếng Việt phổ thông/i);
  }
});
