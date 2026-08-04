export type Bi = Readonly<{ en: string; vi: string }>;

export type ToneKey = "ngang" | "huyen" | "sac" | "hoi-nga" | "nang";
export type WordStatus = "new" | "learning" | "known" | "ignored";

export type PosKey =
  | "classifier"
  | "noun"
  | "verb"
  | "adjective"
  | "pronoun"
  | "conjunction"
  | "phrase"
  | "question"
  | "particle"
  | "adverb"
  | "numeral"
  | "preposition"
  | "letter"
  | "name";

export type KindKey = "dongDao" | "caDao" | "alphabet" | "tonePrimer" | "firstWords" | "scene" | "import";

export type RegionKey = "national" | "central" | "daNang" | "quangNam";
export type LicenseKey = "publicDomain" | "copyrightedExcerpt" | "original" | "user";
export type StoryPattern =
  | "stork"
  | "cat"
  | "dragon"
  | "saw"
  | "steps"
  | "letter"
  | "tone"
  | "sprout"
  | "gourd"
  | "buffalo"
  | "river"
  | "market";

export interface Token {
  text: string;
  entry: string;
  gloss: Bi;
  detail?: Bi;
  pronunciation?: string;
  central?: Bi;
  pos?: PosKey;
  classifier?: boolean;
  hanViet?: { character: string; meaning: string; family: string[] };
}

export interface Sentence {
  id: string;
  translation: Bi;
  tokens: Array<{ text: string; entry?: string }>;
}

export interface Story {
  id: string;
  title: string;
  titleEn: string;
  tier: number;
  kind: KindKey;
  region: RegionKey;
  description: Bi;
  source: string;
  sourceUrl?: string;
  license: LicenseKey;
  accent?: string;
  pattern: StoryPattern;
  sentences: Sentence[];
  interactive?: "alphabet" | "toneMatch";
  /**
   * Shown with the source line. Original readings set in Central Vietnam use it
   * to say plainly that they are standard Vietnamese written for learners, not
   * transcriptions of recorded regional speech.
   */
  attributionNote?: Bi;
}

export type AppView =
  "home" | "library" | "reader" | "review" | "tones" | "garden" | "words" | "import" | "about";

export type ScaffoldMode = "full" | "assisted" | "raw";
export type ThemeMode = "light" | "dark" | "system";
