import * as SQLite from "expo-sqlite";

let database: Promise<SQLite.SQLiteDatabase> | undefined;
function db() {
  return (database ??= (async () => {
    const d = await SQLite.openDatabaseAsync("allexi-v1.db");
    await d.execAsync(
      "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS local_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);",
    );
    return d;
  })());
}
export async function readValue<T>(key: string): Promise<T | null> {
  const row = await (
    await db()
  ).getFirstAsync<{ value: string }>(
    "SELECT value FROM local_state WHERE key = ?",
    key,
  );
  return row ? (JSON.parse(row.value) as T) : null;
}
export async function writeValue(key: string, value: unknown) {
  await (
    await db()
  ).runAsync(
    "INSERT INTO local_state(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    key,
    JSON.stringify(value),
  );
}
