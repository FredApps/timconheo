import type { CardRecord } from "../shared/types.js";
export const MAX_NEW_PER_DAY = 8;
export const MAX_NEW_PER_SESSION = 4;
export const REVIEW_COST_MS = 9000;
export const NEW_COST_MS = 14000;
export interface QueueSettings { lastQueueAt?: number; forgivenessAt?: number; }
export function overdueness(card: CardRecord, now: number): number {
  const raw = card.card.last_review; const last = raw ? new Date(String(raw)).getTime() : card.updatedAt; const scheduledDays = Math.max(Number(card.card.scheduled_days ?? 1), 1);
  return Math.max(0, (now - last) / (scheduledDays * 86400000));
}
export function isNewCard(card: CardRecord): boolean { return Number(card.card.reps ?? 0) < 1; }
export function packQueue(cards: CardRecord[], now: number, budgetMs: number, newToday: number): CardRecord[] {
  const due = [...cards].sort((a, b) => overdueness(b, now) - overdueness(a, now) || a.due - b.due || a.id.localeCompare(b.id));
  const old = due.filter((card) => !isNewCard(card)); const fresh = due.filter(isNewCard).slice(0, Math.max(0, Math.min(MAX_NEW_PER_SESSION, MAX_NEW_PER_DAY - newToday)));
  const result: CardRecord[] = []; let oldIndex = 0; let freshIndex = 0; let elapsed = 0;
  while (elapsed < budgetMs && (oldIndex < old.length || freshIndex < fresh.length)) {
    const shouldNew = freshIndex < fresh.length && (result.length === 0 || result.length % 4 === 3 || oldIndex >= old.length);
    const card = shouldNew ? fresh[freshIndex++] : old[oldIndex++];
    if (!card) break; const cost = isNewCard(card) ? NEW_COST_MS : REVIEW_COST_MS; if (elapsed + cost > budgetMs && result.length > 0) break; result.push(card); elapsed += cost;
  }
  return result;
}
export interface ForgivenessResult { applied: boolean; cards: Array<{ id: string; due: number }>; settings: QueueSettings; }
export function forgiveBacklog(cards: CardRecord[], now: number, settings: QueueSettings): ForgivenessResult {
  const lastQueueAt = settings.lastQueueAt ?? now; const idleDays = (now - lastQueueAt) / 86400000;
  if (idleDays <= 14 || settings.forgivenessAt || cards.length === 0) return { applied: false, cards: [], settings };
  const strongest = Math.max(...cards.map((card) => Number(card.card.stability ?? 1)), 1);
  const rescheduled = cards.map((card) => ({ id: card.id, due: now + Math.round((Number(card.card.stability ?? 1) / strongest) * 21 * 86400000) }));
  return { applied: true, cards: rescheduled, settings: { ...settings, forgivenessAt: now } };
}

