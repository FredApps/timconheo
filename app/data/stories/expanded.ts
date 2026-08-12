import type { Bi, Sentence, Story, StoryPattern } from "../../types";
import { bi, line } from "../helpers";

type LessonLine = { translation: Bi; words: Array<string | [string, string]> };

const LINES: LessonLine[] = [
  {
    translation: bi("Mother and father eat rice.", "Mẹ và ba ăn cơm."),
    words: [
      ["Mẹ", "mẹ"],
      ["và", "và"],
      ["ba", "ba"],
      ["ăn", "ăn"],
      ["cơm", "cơm"],
    ],
  },
  {
    translation: bi("We go to Đà Nẵng.", "Chúng ta đi Đà Nẵng."),
    words: [
      ["Chúng ta", "chúng ta"],
      ["đi", "đi"],
      ["Đà Nẵng", "đà nẵng"],
    ],
  },
  {
    translation: bi("My friend and I go to the market.", "Tôi và bạn đi chợ."),
    words: [
      ["Tôi", "tôi"],
      ["và", "và"],
      ["bạn", "bạn"],
      ["đi", "đi"],
      ["chợ", "chợ"],
    ],
  },
  {
    translation: bi("Do you have rice?", "Bạn có cơm không?"),
    words: [
      ["Bạn", "bạn"],
      ["có", "có"],
      ["cơm", "cơm"],
      ["không", "không"],
    ],
  },
  {
    translation: bi("Mother does not go.", "Mẹ không đi."),
    words: [
      ["Mẹ", "mẹ"],
      ["không", "không"],
      ["đi", "đi"],
    ],
  },
  {
    translation: bi("Father goes to the sea.", "Ba đi biển."),
    words: [
      ["Ba", "ba"],
      ["đi", "đi"],
      ["biển", "biển"],
    ],
  },
  {
    translation: bi("I eat rice.", "Tôi ăn cơm."),
    words: [
      ["Tôi", "tôi"],
      ["ăn", "ăn"],
      ["cơm", "cơm"],
    ],
  },
  {
    translation: bi("You and I go.", "Bạn và tôi đi."),
    words: [
      ["Bạn", "bạn"],
      ["và", "và"],
      ["tôi", "tôi"],
      ["đi", "đi"],
    ],
  },
];

const TITLES: Array<[string, string]> = [
  ["Bữa cơm sáng", "Breakfast"],
  ["Đi cùng nhau", "Going together"],
  ["Bạn mới", "A new friend"],
  ["Ở chợ", "At the market"],
  ["Một ngày chậm", "A slow day"],
  ["Ra biển", "Going to the sea"],
  ["Cơm nhà", "A home meal"],
  ["Hai người bạn", "Two friends"],
  ["Sáng ở Đà Nẵng", "Morning in Đà Nẵng"],
  ["Đường đến chợ", "The way to market"],
  ["Bữa cơm nhỏ", "A small meal"],
  ["Bạn đi đâu", "Where are you going?"],
  ["Chiều bên biển", "Afternoon by the sea"],
  ["Mẹ và tôi", "Mother and me"],
  ["Ba và bạn", "Father and a friend"],
  ["Chúng ta học", "We learn"],
  ["Một câu hỏi", "A question"],
  ["Đi về phía biển", "Toward the sea"],
  ["Gặp nhau ở chợ", "Meeting at market"],
  ["Ngày đầu tiên", "The first day"],
  ["Cùng ăn cơm", "A meal together"],
  ["Đà Nẵng hôm nay", "Đà Nẵng today"],
  ["Bạn có đi không", "Are you going?"],
  ["Mẹ đi chợ", "Mother goes to market"],
  ["Ba ra biển", "Father goes seaward"],
  ["Tôi và thành phố", "The city and me"],
  ["Câu chuyện bữa cơm", "A meal story"],
  ["Bước chân nhỏ", "Small footsteps"],
  ["Buổi sáng yên", "A quiet morning"],
  ["Buổi chiều ấm", "A warm afternoon"],
  ["Ở miền Trung", "In Central Vietnam"],
  ["Gió từ biển", "Wind from the sea"],
  ["Một vòng quanh chợ", "Around the market"],
  ["Bữa cơm cùng bạn", "A meal with a friend"],
  ["Ngày ở Hội An", "A day in Hội An"],
  ["Đường về", "The way back"],
  ["Chào ngày mới", "Hello, new day"],
  ["Cùng nhau tiến bộ", "Growing together"],
];

const PATTERNS: StoryPattern[] = ["sprout", "steps", "market", "river", "gourd", "buffalo"];

function sentencesFor(index: number): Sentence[] {
  return [0, 1, 2].map((offset) => {
    const source = LINES[(index + offset * 3) % LINES.length];
    return line(`lesson-${index + 1}-${offset + 1}`, source.translation, source.words);
  });
}

/**
 * Original graded practice. The intentionally recurring core vocabulary gives
 * a true beginner comprehensible input before later readings become denser.
 */
export const EXPANDED_STORIES: Story[] = TITLES.map(([title, titleEn], index) => ({
  id: `graded-${String(index + 1).padStart(2, "0")}`,
  title,
  titleEn,
  tier: 1 + Math.floor(index / 13),
  kind: index < 10 ? "firstWords" : "scene",
  region: index < 20 ? "national" : index % 2 ? "daNang" : "central",
  description: bi(
    "Short original graded practice using a familiar core in a new order.",
    "Bài luyện đọc nguyên bản ngắn, sắp xếp lại nhóm từ quen thuộc.",
  ),
  source: "Original Tìm Con Heo learning material",
  license: "original",
  accent: index >= 20 ? "Standard Vietnamese; Central setting" : undefined,
  attributionNote:
    index >= 10
      ? bi(
          index >= 20
            ? "Set in Central Vietnam and written in standard Vietnamese; it is not a dialect transcription."
            : "Original graded learning material written in standard Vietnamese.",
          index >= 20
            ? "Bối cảnh miền Trung, viết bằng tiếng Việt phổ thông; không phải bản ghi phương ngữ."
            : "Tài liệu học phân cấp nguyên bản, viết bằng tiếng Việt phổ thông.",
        )
      : undefined,
  grammarNotes: [
    {
      title: bi("Word order", "Trật tự từ"),
      body: bi(
        "Vietnamese usually keeps subject–verb–object order and does not conjugate the verb.",
        "Tiếng Việt thường theo trật tự chủ ngữ–động từ–tân ngữ và động từ không biến đổi.",
      ),
    },
  ],
  culturalNotes:
    index >= 20
      ? [
          {
            title: bi("Central setting", "Bối cảnh miền Trung"),
            body: bi(
              "The setting is Central Vietnamese; the language remains the national written standard.",
              "Bối cảnh ở miền Trung; ngôn ngữ vẫn là tiếng Việt phổ thông.",
            ),
          },
        ]
      : undefined,
  pattern: PATTERNS[index % PATTERNS.length],
  sentences: sentencesFor(index),
}));
