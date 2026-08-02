export type ToneKey = "ngang" | "huyền" | "sắc" | "hỏi-ngã" | "nặng";

export type WordStatus = "new" | "learning" | "known" | "ignored";

export interface Token {
  text: string;
  entry: string;
  gloss: string;
  detail?: string;
  pronunciation?: string;
  central?: string;
  pos?: string;
  classifier?: boolean;
  hanViet?: { character: string; meaning: string; family: string[] };
}

export interface Sentence {
  id: string;
  translation: string;
  tokens: Token[];
}

export interface Story {
  id: string;
  title: string;
  titleEn: string;
  tier: number;
  kind: string;
  region: string;
  minutes: number;
  difficulty: number;
  unknownRatio: number;
  description: string;
  source: string;
  license: string;
  accent: string;
  pattern: "stork" | "cat" | "dragon" | "saw" | "steps";
  sentences: Sentence[];
}

export type AppView =
  | "home"
  | "reader"
  | "review"
  | "tones"
  | "garden"
  | "words"
  | "import"
  | "about";
