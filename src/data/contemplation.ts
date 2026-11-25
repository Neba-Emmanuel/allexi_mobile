import { allVerses } from "./bible";
import type { Verse } from "../../shared/src/index";

// Use the local calendar date so the passage remains stable across reloads
// and changes at the reader's midnight rather than at midnight UTC.
export function contemplationDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function dailyContemplation(date?: Date): Verse;
export function dailyContemplation(
  date: Date,
  verses: readonly Verse[],
): Verse | null;
export function dailyContemplation(
  date = new Date(),
  verses: readonly Verse[] = allVerses,
) {
  if (!verses.length) return null;
  const key = contemplationDateKey(date);
  let hash = 2166136261;
  for (const character of key) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return verses[(hash >>> 0) % verses.length];
}
