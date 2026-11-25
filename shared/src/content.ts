import { z } from "zod";
import allexiGenesis from "../data/allexi-genesis-1.json" with { type: "json" };
import { allVerses, books, chapterVerses, verseCount } from "./scripture.ts";
import type { Passage, Verse } from "./index.js";

export const editionSchema = z.enum(["kjv", "allexi"]);
export type Edition = z.infer<typeof editionSchema>;
export const editionNames: Record<Edition, string> = {
  kjv: "King James Version",
  allexi: "Allexi Bible",
};
export const editionLabels: Record<Edition, string> = {
  kjv: "KJV",
  allexi: "ALLEXI",
};
export const editorialStatusSchema = z.enum(["pending", "draft", "updated"]);
export type EditorialStatus = z.infer<typeof editorialStatusSchema>;
export const coordinateSchema = z.object({
  book: z.number().int().min(0).max(65),
  chapter: z.number().int().positive().max(150),
  verse: z.number().int().positive().max(176),
});
export function validCoordinate(p: Passage) {
  return p.verse >= 1 && p.verse <= verseCount(p.book, p.chapter);
}
export const chapterQuerySchema = z
  .object({
    edition: editionSchema,
    book: z.coerce.number().int().min(0).max(65),
    chapter: z.coerce.number().int().positive(),
  })
  .refine((p) => p.chapter <= books[p.book].chapters, "Unknown chapter");
export const draftChangeSchema = coordinateSchema
  .extend({
    text: z.string().trim().min(1).max(20000),
    status: z.enum(["draft", "updated"]),
    expectedRevision: z.number().int().nonnegative(),
  })
  .strict()
  .refine(validCoordinate, "Unknown verse");
export const chapterSaveSchema = z
  .object({
    edition: editionSchema,
    book: z.number().int().min(0).max(65),
    chapter: z.number().int().positive(),
    changes: z.array(draftChangeSchema).min(1).max(176),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<number>();
    for (const change of value.changes) {
      if (
        change.book !== value.book ||
        change.chapter !== value.chapter ||
        seen.has(change.verse)
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Changes must contain unique verses from the selected chapter",
        });
      seen.add(change.verse);
    }
  });
export const publishSchema = z
  .object({
    edition: editionSchema,
    book: z.number().int().min(0).max(65),
    chapter: z.number().int().positive(),
    revisions: z
      .array(
        z
          .object({
            verse: z.number().int().positive(),
            revision: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(176),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<number>();
    for (const row of value.revisions) {
      if (
        !validCoordinate({ ...value, verse: row.verse }) ||
        seen.has(row.verse)
      )
        ctx.addIssue({ code: "custom", message: "Invalid or duplicate verse" });
      seen.add(row.verse);
    }
  });
export const defaultEditionSchema = z
  .object({
    edition: editionSchema,
    expectedRevision: z.number().int().nonnegative(),
  })
  .strict();
export type DraftChange = z.infer<typeof draftChangeSchema>;
export type EditorialVerse = Verse & {
  status: EditorialStatus;
  revision: number;
  updated_at: string | null;
  updated_by: string | null;
  published_revision: number | null;
  published_text: string | null;
};
export type EditorialChapter = {
  edition: Edition;
  book: number;
  chapter: number;
  verses: EditorialVerse[];
};
export type ChapterProgress = {
  book: number;
  chapter: number;
  total: number;
  draft: number;
  updated: number;
  published: number;
};
export type ContentOverview = {
  edition: Edition;
  defaultEdition: Edition;
  revision: number;
  chapters: ChapterProgress[];
};
export type EditorialHistory = {
  id: number;
  edition: Edition;
  book: number | null;
  chapter: number | null;
  verse: number | null;
  action: string;
  before_text: string | null;
  after_text: string | null;
  status: string | null;
  revision: number;
  actor_id: string | null;
  created_at: string;
};
const publishedVerseSchema = coordinateSchema
  .extend({
    edition: editionSchema,
    text: z.string().min(1).max(20000),
    revision: z.number().int().positive(),
    published_at: z.string(),
  })
  .strict()
  .refine(validCoordinate, "Unknown verse");
export const contentSnapshotSchema = z.object({
  defaultEdition: editionSchema,
  revision: z.number().int().nonnegative(),
  configured: z.boolean().optional(),
  verses: z.array(publishedVerseSchema).max(62204),
});
export type ContentSnapshot = z.infer<typeof contentSnapshotSchema>;
export const emptyContent: ContentSnapshot = {
  defaultEdition: "kjv",
  revision: 0,
  verses: [],
};
// Approved text ships with the app; later server publications replace this snapshot.
export const bundledContent: ContentSnapshot = {
  defaultEdition: "allexi",
  revision: 0,
  verses: allexiGenesis.map((verse) => ({
    ...verse,
    edition: "allexi",
    revision: 1,
    published_at: "2026-10-31T00:00:00.000Z",
  })),
};

export const verseKey = (p: Passage) => `${p.book}.${p.chapter}.${p.verse}`;

export function publishedBible(snapshot: ContentSnapshot, edition: Edition) {
  const publications = snapshot.verses.filter((v) => v.edition === edition);
  const overrides = new Map(publications.map((v) => [verseKey(v), v]));
  const verses: Verse[] =
    edition === "kjv"
      ? allVerses.map((v) => overrides.get(verseKey(v)) ?? v)
      : publications;
  const index = new Map(verses.map((v) => [verseKey(v), v]));
  const chapters = new Map<string, Verse[]>();
  for (const verse of verses) {
    const key = `${verse.book}.${verse.chapter}`;
    const rows = chapters.get(key) ?? [];
    rows.push(verse);
    chapters.set(key, rows);
  }
  for (const rows of chapters.values()) rows.sort((a, b) => a.verse - b.verse);
  return {
    verses,
    chapter: (book: number, chapter: number) =>
      chapters.get(`${book}.${chapter}`) ?? [],
    text: (p: Passage) => index.get(verseKey(p))?.text ?? "",
    get: (p: Passage) => index.get(verseKey(p)),
  };
}

export function previewOverview(edition: Edition): ContentOverview {
  return {
    edition,
    defaultEdition: bundledContent.defaultEdition,
    revision: 0,
    chapters: books.flatMap((book) =>
      Array.from({ length: book.chapters }, (_, i) => ({
        book: book.id,
        chapter: i + 1,
        total: chapterVerses(book.id, i + 1).length,
        draft: 0,
        updated: edition === "allexi" && book.id === 0 && i === 0 ? 31 : 0,
        published: edition === "allexi" && book.id === 0 && i === 0 ? 31 : 0,
      })),
    ),
  };
}
