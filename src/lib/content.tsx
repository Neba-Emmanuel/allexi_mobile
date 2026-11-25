import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  contentSnapshotSchema,
  bundledContent,
  publishedBible,
  type ContentSnapshot,
  type Edition,
} from "../../shared/src/content";
import { names } from "../data/bible";
import { useStore } from "./store";
import { apiUrl, supabase } from "./auth";
import { readValue, writeValue } from "./storage";

// Reader copy stays neutral; precise source-edition names remain in the admin.
export const readerEditionNames: Record<Edition, string> = {
  kjv: "Standard edition",
  allexi: "Allexi Bible",
};
export const readerEditionLabels: Record<Edition, string> = {
  kjv: "STANDARD",
  allexi: "ALLEXI",
};

export class ContentApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function adminRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  if (!supabase || !apiUrl)
    throw new ContentApiError(
      "Connect Supabase and the Node API to manage scripture.",
      503,
    );
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session)
    throw new ContentApiError(
      "Sign in with an administrator account in Settings.",
      401,
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  try {
    const response = await fetch(
      `${apiUrl.replace(/\/$/, "")}/v1/admin/${path}`,
      {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new ContentApiError(
        data.error ?? "The request could not be completed.",
        response.status,
      );
    return data as T;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}

type ContentValue = {
  ready: boolean;
  snapshot: ContentSnapshot;
  edition: Edition;
  selection: Edition | null;
  editionName: string;
  bible: ReturnType<typeof publishedBible>;
  refresh: () => Promise<void>;
  chooseEdition: (edition: Edition | null) => void;
  search: (
    query: string,
    scope?: string,
  ) => ReturnType<typeof publishedBible>["verses"];
};
// This release starts readers on the Allexi default; new explicit choices persist.
const cacheKey = `scripture:published:v3:${apiUrl ?? "unconfigured"}`;
const Context = createContext<ContentValue | null>(null);
export function useContent() {
  const value = useContext(Context);
  if (!value) throw new Error("Content provider is missing");
  return value;
}

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const { online } = useStore();
  const [snapshot, setSnapshot] = useState<ContentSnapshot>(bundledContent),
    [selection, setSelection] = useState<Edition | null>(null),
    [ready, setReady] = useState(false);
  const current = useRef(bundledContent),
    busy = useRef(false),
    mounted = useRef(true);
  const refresh = useCallback(async () => {
    if (!apiUrl || busy.current) return;
    busy.current = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/v1/content`, {
        headers: current.current.configured
          ? { "If-None-Match": `"scripture-${current.current.revision}"` }
          : {},
        signal: controller.signal,
      });
      if (response.status === 304) return;
      if (!response.ok)
        throw new Error("Published scripture is temporarily unavailable.");
      const next = contentSnapshotSchema.parse(await response.json());
      if (!mounted.current || next.configured === false) return;
      await writeValue(cacheKey, next);
      if (mounted.current) {
        current.current = next;
        setSnapshot(next);
      }
    } catch {
      // Reader content remains available during connection failures. Admin actions
      // report errors explicitly through adminRequest rather than claiming success.
    } finally {
      clearTimeout(timeout);
      busy.current = false;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void Promise.all([
      readValue<unknown>(cacheKey),
      readValue<Edition | null>("scripture:selection:v2"),
    ])
      .then(([cached, picked]) => {
        if (!mounted.current) return;
        const parsed = contentSnapshotSchema.safeParse(cached);
        if (parsed.success) {
          current.current = parsed.data;
          setSnapshot(parsed.data);
        }
        if (picked === "kjv" || picked === "allexi") setSelection(picked);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setReady(true);
      });
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || !online) return;
    void refresh();
    const interval = setInterval(() => void refresh(), 60000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [online, ready, refresh]);
  const chooseEdition = useCallback((next: Edition | null) => {
    setSelection(next);
    void writeValue("scripture:selection:v2", next).catch(() => {});
  }, []);
  const edition = selection ?? snapshot.defaultEdition;
  const bible = useMemo(
    () => publishedBible(snapshot, edition),
    [snapshot, edition],
  );
  const search = useCallback(
    (query: string, scope = "All") => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      const ref = q.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
      if (ref) {
        const book = names.findIndex(
          (name) =>
            name.toLowerCase() === ref[1] ||
            (name === "Psalms" && ref[1] === "psalm"),
        );
        if (book >= 0)
          return bible
            .chapter(book, Number(ref[2]))
            .filter((v) => !ref[3] || v.verse === Number(ref[3]));
      }
      return bible.verses.filter(
        (v) =>
          (scope === "All" ||
            (scope === "Old"
              ? v.book < 39
              : scope === "New"
                ? v.book >= 39
                : v.book >= 39 && v.book <= 42)) &&
          v.text.toLowerCase().includes(q),
      );
    },
    [bible],
  );
  return (
    <Context.Provider
      value={{
        ready,
        snapshot,
        selection,
        edition,
        editionName: readerEditionNames[edition],
        bible,
        refresh,
        chooseEdition,
        search,
      }}
    >
      {children}
    </Context.Provider>
  );
}
