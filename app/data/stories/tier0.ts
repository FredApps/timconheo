import type { Story } from "../../types";
import { bi, line } from "../helpers";

/**
 * Tier 0 is where someone who has never seen Vietnamese starts: the letters
 * English does not have, the tone marks, and a first handful of words.
 *
 * These are `Story` entries like everything else, so the library, the reader,
 * progress and difficulty all work on them unchanged. The two genuinely
 * non-linear ones carry `interactive`, which the reader delegates to a component.
 */
export const TIER0_STORIES: Story[] = [
  {
    id: "tier0-alphabet",
    title: "Chữ đặc biệt",
    titleEn: "Special letters",
    tier: 0,
    kind: "alphabet",
    region: "national",
    description: bi(
      "Meet the seven letters English does not have.",
      "Làm quen với bảy chữ tiếng Anh không có.",
    ),
    source: "Original learning material",
    license: "original",
    pattern: "letter",
    interactive: "alphabet",
    sentences: [
      line(
        "alphabet-1",
        bi(
          "Vietnamese has a few letters worth meeting slowly.",
          "Tiếng Việt có vài chữ đáng làm quen thật chậm.",
        ),
        ["đ", "ă", "â", "ê", "ô", "ơ", "ư"],
      ),
    ],
  },
  {
    id: "tier0-tones",
    title: "Năm đường nét",
    titleEn: "Five tone shapes",
    tier: 0,
    kind: "tonePrimer",
    region: "daNang",
    description: bi(
      "Six written marks, five spoken shapes in Đà Nẵng.",
      "Sáu dấu viết, năm đường nét khi nói ở Đà Nẵng.",
    ),
    source: "Original learning material",
    license: "original",
    pattern: "tone",
    interactive: "toneMatch",
    sentences: [
      line(
        "tone-1",
        bi(
          "A written mark points the reader; the voice brings it alive.",
          "Dấu viết chỉ đường; giọng nói làm nó sống.",
        ),
        ["thanh", "điệu"],
      ),
    ],
  },
  {
    id: "tier0-first-words",
    title: "Những từ đầu tiên",
    titleEn: "First words",
    tier: 0,
    kind: "firstWords",
    region: "national",
    description: bi(
      "A tiny first set: people, food, and going.",
      "Một nhóm nhỏ đầu tiên: người, thức ăn và việc đi.",
    ),
    source: "Original learning material",
    license: "original",
    pattern: "sprout",
    sentences: [
      line("first-1", bi("Mother and father eat rice.", "Mẹ và ba ăn cơm."), [
        ["Mẹ", "mẹ"],
        ["và", "và"],
        ["ba", "ba"],
        ["ăn", "ăn"],
        ["cơm", "cơm"],
      ]),
      line("first-2", bi("We go to Đà Nẵng.", "Chúng ta đi Đà Nẵng."), [
        ["Chúng ta", "chúng ta"],
        ["đi", "đi"],
        ["Đà Nẵng", "đà nẵng"],
      ]),
    ],
  },
];
