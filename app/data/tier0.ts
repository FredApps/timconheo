import { ALPHABET } from "./alphabet";
import type { Story } from "../types";
export const TIER0_STORIES: Story[] = [{ id: "tier0-alphabet-practice", title: "Chữ và âm", titleEn: "Letters and sounds", tier: 0, kind: "alphabet", region: "national", description: { en: "Tap a letter to see a mouth cue.", vi: "Chạm vào chữ để xem gợi ý khẩu hình." }, source: "Original learning material", license: "original", pattern: "letter", interactive: "alphabet", sentences: ALPHABET.map((item) => ({ id: "letter-" + item.letter, translation: item.name, tokens: [{ text: item.letter, entry: item.letter }] })) }];

