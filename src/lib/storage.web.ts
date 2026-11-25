import { openDB } from "idb";
// Browser preview uses IndexedDB; iOS and Android use the SQLite implementation.
const database = () =>
  openDB("allexi-v1", 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
export async function readValue<T>(key: string): Promise<T | null> {
  return (await (await database()).get("state", key)) ?? null;
}
export async function writeValue(key: string, value: unknown) {
  await (await database()).put("state", value, key);
}
