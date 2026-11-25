import { z } from "zod";
import { verseCount } from "./scripture.ts";

const mutationObject = z
  .object({
    id: z.string().min(1).max(100),
    kind: z.enum(["bookmark", "highlight", "note", "progress"]),
    book: z.number().int().min(0).max(65),
    chapter: z.number().int().min(1).max(150),
    verse: z.number().int().min(1).max(176),
    text: z.string().max(20000),
    color: z.enum(["gold", "sage", "mint", "rose", "slate"]).nullable(),
    deleted: z.boolean(),
    mutation_id: z.uuid(),
  })
  .strict();
export const mutationSchema = mutationObject
  .refine(
    (row) =>
      row.id ===
      (row.kind === "progress"
        ? "progress"
        : `${row.book}.${row.chapter}.${row.verse}.${row.kind}`),
    { message: "Invalid record coordinate" },
  )
  .refine((row) => row.verse <= verseCount(row.book, row.chapter), {
    message: "Unknown scripture verse",
  });
export const syncRequestSchema = z
  .object({ changes: z.array(mutationSchema).max(100) })
  .strict();
export type Mutation = z.infer<typeof mutationSchema>;
export type Annotation = Mutation & { revision: number; dirty: boolean };
export const syncResponseSchema = z
  .object({
    records: z.array(
      mutationObject
        .extend({ revision: z.number().int().positive() })
        .refine(
          (row) => row.verse <= verseCount(row.book, row.chapter),
          "Unknown scripture verse",
        ),
    ),
    acknowledged: z.array(z.uuid()).max(100),
  })
  .strict();
export type SyncResponse = z.infer<typeof syncResponseSchema>;
export type Passage = { book: number; chapter: number; verse: number };
export type Verse = Passage & { text: string };
export const colors = {
  gold: "#ECDBA7",
  sage: "#D5DEBB",
  mint: "#CDE1D3",
  rose: "#E9CDD0",
  slate: "#CED9E2",
};

// A change made while a request is in flight must never be acknowledged by that request.
export function mergeSync(
  local: Annotation[],
  response: SyncResponse,
): Annotation[] {
  const ack = new Set(response.acknowledged);
  const map = new Map(
    local.map((row) => [
      row.id,
      { ...row, dirty: row.dirty && !ack.has(row.mutation_id) },
    ]),
  );
  for (const remote of response.records) {
    const current = map.get(remote.id);
    if (!current?.dirty) map.set(remote.id, { ...remote, dirty: false });
  }
  return [...map.values()];
}
