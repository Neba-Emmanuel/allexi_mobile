import corpus from "../data/kjv.json" with { type: "json" };
import type { Passage, Verse } from "./index.js";

export const names = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];
export const books = corpus.map((book, id) => ({
  id,
  name: names[id],
  chapters: book.chapters.length,
  testament: id < 39 ? "Old" : "New",
}));
const clean = (text: string) =>
  text
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
export function chapterVerses(book: number, chapter: number): Verse[] {
  return (corpus[book]?.chapters[chapter - 1] ?? []).map((text, i) => ({
    book,
    chapter,
    verse: i + 1,
    text: clean(text),
  }));
}
export function verseText(p: Passage) {
  return clean(corpus[p.book]?.chapters[p.chapter - 1]?.[p.verse - 1] ?? "");
}
export function verseCount(book: number, chapter: number) {
  return corpus[book]?.chapters[chapter - 1]?.length ?? 0;
}
export function reference(p: Passage) {
  return `${names[p.book]} ${p.chapter}:${p.verse}`;
}
export const allVerses: Verse[] = corpus.flatMap((book, b) =>
  book.chapters.flatMap((chapter, c) =>
    chapter.map((text, v) => ({
      book: b,
      chapter: c + 1,
      verse: v + 1,
      text: clean(text),
    })),
  ),
);
export function searchVerses(query: string, scope = "All"): Verse[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const ref = q.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
  if (ref) {
    const b = names.findIndex(
      (name) =>
        name.toLowerCase() === ref[1] ||
        (name === "Psalms" && ref[1] === "psalm"),
    );
    if (b >= 0)
      return chapterVerses(b, Number(ref[2])).filter(
        (v) => !ref[3] || v.verse === Number(ref[3]),
      );
  }
  return allVerses.filter(
    (v) =>
      (scope === "All" ||
        (scope === "Old"
          ? v.book < 39
          : scope === "New"
            ? v.book >= 39
            : v.book >= 39 && v.book <= 42)) &&
      v.text.toLowerCase().includes(q),
  );
}
export function adjacent(p: Passage, direction: number): Passage {
  const next = p.chapter + direction;
  if (next >= 1 && next <= books[p.book].chapters)
    return { ...p, chapter: next, verse: 1 };
  const b = p.book + direction;
  return b >= 0 && b < 66
    ? { book: b, chapter: direction > 0 ? 1 : books[b].chapters, verse: 1 }
    : p;
}
