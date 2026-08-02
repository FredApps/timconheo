import type { Bi } from "../types";
export interface AlphabetEntry { letter: string; name: Bi; ipa: string; englishNearest: Bi; note: Bi; }
export const ALPHABET: AlphabetEntry[] = [
  { letter: "đ", name: { en: "d with stroke", vi: "đê" }, ipa: "/ɗ/", englishNearest: { en: "a voiced d, not English d exactly", vi: "âm d hữu thanh, không hẳn là d tiếng Anh" }, note: { en: "The stroke changes the letter and sound.", vi: "Nét gạch làm thay đổi chữ và âm." } },
  { letter: "ă", name: { en: "short a", vi: "ă" }, ipa: "/ă/", englishNearest: { en: "a in about, kept short", vi: "a trong âm ngắn" }, note: { en: "The breve marks a short vowel.", vi: "Dấu breve đánh dấu nguyên âm ngắn." } },
  { letter: "â", name: { en: "central vowel", vi: "â" }, ipa: "/ə̆/", englishNearest: { en: "a in about", vi: "a trong about" }, note: { en: "It is not the same as a.", vi: "Không giống a." } },
  { letter: "ê", name: { en: "close e", vi: "ê" }, ipa: "/e/", englishNearest: { en: "ay in say", vi: "ây trong đây" }, note: { en: "Keep the mouth closer than for e.", vi: "Khép miệng hơn âm e." } },
  { letter: "ô", name: { en: "close o", vi: "ô" }, ipa: "/o/", englishNearest: { en: "o in go", vi: "ô trong ô tô" }, note: { en: "A rounded, close vowel.", vi: "Một nguyên âm tròn môi, khép." } },
  { letter: "ơ", name: { en: "central o", vi: "ơ" }, ipa: "/ɤ/", englishNearest: { en: "no exact English match", vi: "không có âm tương đương hẳn" }, note: { en: "Relax the tongue and keep lips unrounded.", vi: "Thả lưỡi và không tròn môi." } },
  { letter: "ư", name: { en: "central u", vi: "ư" }, ipa: "/ɯ/", englishNearest: { en: "no exact English match", vi: "không có âm tương đương hẳn" }, note: { en: "A high vowel with unrounded lips.", vi: "Nguyên âm cao, môi không tròn." } },
];

