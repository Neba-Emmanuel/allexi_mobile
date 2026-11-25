type Manifest = { generation: string; count: number };
type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
export function createSecureSessionStorage(
  secure: Storage,
  legacy: Storage,
  generation: () => string,
): Storage {
  const prefix = (key: string) =>
    `allexi.${key.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  async function manifest(base: string): Promise<Manifest | null> {
    const value = await secure.getItem(base);
    if (!value) return null;
    const parsed = JSON.parse(value);
    if (
      typeof parsed.generation !== "string" ||
      !/^[a-zA-Z0-9-]+$/.test(parsed.generation) ||
      !Number.isInteger(parsed.count) ||
      parsed.count < 1 ||
      parsed.count > 1024
    )
      throw new Error(
        "Your saved session could not be read. Please sign in again.",
      );
    return parsed;
  }
  const removeChunks = async (base: string, row: Manifest | null) => {
    if (row)
      await Promise.all(
        Array.from({ length: row.count }, (_, i) =>
          secure.removeItem(`${base}.${row.generation}.${i}`),
        ),
      );
  };
  const storage: Storage = {
    async getItem(key) {
      const base = prefix(key),
        row = await manifest(base);
      if (row) {
        const chunks = await Promise.all(
          Array.from({ length: row.count }, (_, i) =>
            secure.getItem(`${base}.${row.generation}.${i}`),
          ),
        );
        if (chunks.some((chunk) => chunk === null))
          throw new Error(
            "Your saved session could not be read. Please sign in again.",
          );
        return chunks.join("");
      }
      const value = await legacy.getItem(key);
      if (value) await storage.setItem(key, value);
      return value;
    },
    async setItem(key, value) {
      const base = prefix(key),
        previous = await manifest(base);
      // At most 1,800 UTF-8 bytes per value, including non-ASCII session metadata.
      const characters = Array.from(value);
      const chunks: string[] = [];
      for (let i = 0; i < characters.length; i += 450)
        chunks.push(characters.slice(i, i + 450).join(""));
      if (!chunks.length) chunks.push("");
      if (chunks.length > 1024) throw new Error("Session data is too large.");
      const row = { generation: generation(), count: chunks.length };
      const writes = await Promise.allSettled(
        chunks.map((chunk, i) =>
          secure.setItem(`${base}.${row.generation}.${i}`, chunk),
        ),
      );
      const failed = writes.find((write) => write.status === "rejected");
      if (failed) {
        await removeChunks(base, row).catch(() => {});
        throw failed.reason;
      }
      try {
        await secure.setItem(base, JSON.stringify(row));
      } catch (error) {
        await removeChunks(base, row).catch(() => {});
        throw error;
      }
      await removeChunks(base, previous).catch(() => {});
      await legacy.removeItem(key);
    },
    async removeItem(key) {
      const base = prefix(key),
        row = await manifest(base);
      await secure.removeItem(base);
      await removeChunks(base, row);
      await legacy.removeItem(key);
    },
  };
  return storage;
}
