import Dexie, { type EntityTable } from "dexie";
import { createEmptyCard, fsrs, Rating, type Card } from "ts-fsrs";
import type { WordStatus } from "../types";

export interface WordRecord {
  entry: string;
  gloss: string;
  status: WordStatus;
  timesSeen: number;
  firstSeen: number;
  updatedAt: number;
}

export interface CardRecord {
  id: string;
  entry: string;
  gloss: string;
  sourceSentenceId: string;
  card: Card;
  updatedAt: number;
}

export interface ImportRecord {
  id?: number;
  title: string;
  raw: string;
  importedAt: number;
  difficulty: number;
}

class TimConHeoDatabase extends Dexie {
  words!: EntityTable<WordRecord, "entry">;
  cards!: EntityTable<CardRecord, "id">;
  imports!: EntityTable<ImportRecord, "id">;

  constructor() {
    super("timconheo");
    this.version(1).stores({
      words: "entry, status, updatedAt",
      cards: "id, entry, card.due, updatedAt",
      imports: "++id, importedAt",
    });
  }
}

export const db = new TimConHeoDatabase();
const scheduler = fsrs({ enable_fuzz: true, enable_short_term: false });

export async function rememberWord(
  entry: string,
  gloss: string,
  sourceSentenceId: string,
) {
  const now = Date.now();
  const current = await db.words.get(entry);
  await db.words.put({
    entry,
    gloss,
    status: current?.status === "known" ? "known" : "learning",
    timesSeen: (current?.timesSeen ?? 0) + 1,
    firstSeen: current?.firstSeen ?? now,
    updatedAt: now,
  });
  const id = `recognition:${entry}`;
  const existing = await db.cards.get(id);
  if (!existing) {
    await db.cards.put({
      id,
      entry,
      gloss,
      sourceSentenceId,
      card: createEmptyCard(new Date()),
      updatedAt: now,
    });
  }
}

export async function updateWordStatus(entry: string, status: WordStatus) {
  const current = await db.words.get(entry);
  if (!current) return;
  await db.words.update(entry, { status, updatedAt: Date.now() });
}

export async function reviewCard(id: string, rating: Rating) {
  const record = await db.cards.get(id);
  if (!record) return;
  const scheduled = scheduler.next(record.card, new Date(), rating);
  await db.cards.update(id, { card: scheduled.card, updatedAt: Date.now() });
  await updateWordStatus(record.entry, rating >= Rating.Good ? "known" : "learning");
}

export { Rating };
