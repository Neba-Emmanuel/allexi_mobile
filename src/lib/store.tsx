import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import type { Session } from "@supabase/supabase-js";
import {
  mergeSync,
  syncResponseSchema,
  type Annotation,
  type Mutation,
  type Passage,
  type SyncResponse,
} from "../../shared/src/index";
import { readValue, writeValue } from "./storage";
import { apiUrl, supabase, verifyAdministrator } from "./auth";

type Preferences = {
  dark: boolean;
  fontSize: number;
  lineHeight: number;
  sans: boolean;
  welcomed: boolean;
};
const defaults: Preferences = {
  dark: false,
  fontSize: 21,
  lineHeight: 1.75,
  sans: false,
  welcomed: false,
};
const start: Passage = { book: 0, chapter: 1, verse: 1 };
// Ten maximum-length notes fit comfortably within the API's 2 MB body limit.
const batchSize = 10;
type Store = {
  ready: boolean;
  error: string;
  records: Annotation[];
  preferences: Preferences;
  position: Passage;
  session: Session | null;
  online: boolean;
  syncing: boolean;
  syncMessage: string;
  pending: number;
  setPreferences: (p: Partial<Preferences>) => void;
  go: (p: Passage) => void;
  save: (
    kind: Mutation["kind"],
    p: Passage,
    values?: Partial<Pick<Mutation, "text" | "color" | "deleted">>,
  ) => Promise<void>;
  sync: () => Promise<void>;
  clearAccount: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export const useStore = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Missing store");
  return ctx;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [records, setRecords] = useState<Annotation[]>([]),
    [preferences, setPrefs] = useState(defaults);
  const [session, setSession] = useState<Session | null>(null),
    [online, setOnline] = useState(true),
    [foreground, setForeground] = useState(0);
  const [syncing, setSyncing] = useState(false),
    [syncMessage, setSyncMessage] = useState("Your study is ready");
  const rows = useRef<Annotation[]>([]),
    owner = useRef("guest"),
    activeSession = useRef<Session | null>(null);
  const prefs = useRef(defaults),
    busy = useRef(false),
    queue = useRef(Promise.resolve());
  const exclusive = (work: () => Promise<void>) => {
    const task = queue.current.then(work);
    queue.current = task.catch((e) =>
      setError(e instanceof Error ? e.message : "Storage could not be updated"),
    );
    return task;
  };
  const persistRows = async (next: Annotation[]) => {
    await writeValue(`records:${owner.current}`, next);
    rows.current = next;
    setRecords(next);
  };
  useEffect(() => {
    let live = true;
    void exclusive(async () => {
      const [p, nativeScope] = await Promise.all([
        readValue<Preferences>("preferences"),
        Platform.OS === "web" ? Promise.resolve(null) : readValue<string>("readerScope"),
      ]);
      const auth = Platform.OS === "web" || !nativeScope
        ? await supabase?.auth.getSession()
        : undefined;
      const restored = auth?.data.session ?? null;
      let s = Platform.OS === "web" ? restored : null;
      if (s) {
        try {
          await verifyAdministrator(s);
        } catch {
          s = null;
        }
      }
      // Preserve a previous native account’s annotations independently of its token.
      owner.current = Platform.OS === "web"
        ? s?.user.id ?? "guest"
        : nativeScope ?? restored?.user.id ?? "guest";
      if (Platform.OS !== "web") await writeValue("readerScope", owner.current);
      activeSession.current = s;
      rows.current =
        (await readValue<Annotation[]>(`records:${owner.current}`)) ?? [];
      if (live) {
        setSession(s);
        setRecords(rows.current);
        prefs.current = { ...defaults, ...p };
        setPrefs(prefs.current);
        setReady(true);
      }
    }).catch((e) => setError(String(e)));
    const sub = NetInfo.addEventListener((state) =>
      setOnline(
        state.isConnected !== false && state.isInternetReachable !== false,
      ),
    );
    const auth = Platform.OS === "web" ? supabase?.auth.onAuthStateChange((_event, session) => {
      void exclusive(async () => {
        if (!live) return;
        let s = session;
        if (s) {
          try {
            await verifyAdministrator(s);
          } catch {
            s = null;
          }
        }
        if (!live) return;
        if (owner.current !== (s?.user.id ?? "guest")) {
          owner.current = s?.user.id ?? "guest";
          let next =
            (await readValue<Annotation[]>(`records:${owner.current}`)) ?? [];
          // Guest data is claimed once; data belonging to another account is never uploaded.
          if (s) {
            const guest =
              (await readValue<Annotation[]>("records:guest")) ?? [];
            const ids = new Set(next.map((r) => r.id));
            next = [
              ...next,
              ...guest
                .filter((r) => !ids.has(r.id))
                .map((r) => ({ ...r, dirty: true })),
            ];
            await writeValue(`records:${owner.current}`, next);
            await writeValue("records:guest", []);
          }
          rows.current = next;
          setRecords(next);
        }
        activeSession.current = s;
        setSession(s);
        setSyncMessage("Your study is ready");
      });
    }).data.subscription : undefined;
    if (Platform.OS === "web" && AppState.currentState === "active") supabase?.auth.startAutoRefresh();
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (Platform.OS === "web") supabase?.auth.startAutoRefresh();
        setForeground((n) => n + 1);
      } else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      live = false;
      sub();
      auth?.unsubscribe();
      app.remove();
    };
  }, []);

  async function save(
    kind: Mutation["kind"],
    p: Passage,
    values: Partial<Pick<Mutation, "text" | "color" | "deleted">> = {},
  ) {
    await exclusive(async () => {
      const id =
        kind === "progress"
          ? "progress"
          : `${p.book}.${p.chapter}.${p.verse}.${kind}`;
      const previous = rows.current.find((r) => r.id === id);
      const row: Annotation = {
        text: "",
        color: null,
        deleted: false,
        revision: 0,
        ...previous,
        id,
        kind,
        book: p.book,
        chapter: p.chapter,
        verse: p.verse,
        ...values,
        mutation_id: Crypto.randomUUID(),
        dirty: true,
      };
      await persistRows([...rows.current.filter((r) => r.id !== id), row]);
    });
  }
  function setPreferences(p: Partial<Preferences>) {
    void exclusive(async () => {
      const next = { ...prefs.current, ...p };
      await writeValue("preferences", next);
      prefs.current = next;
      setPrefs(next);
    });
  }
  function go(p: Passage) {
    void save("progress", p).catch(() => {});
  }
  async function clearAccount() {
    const account = owner.current;
    await exclusive(async () => {
      await writeValue(`records:${account}`, []);
      if (owner.current === account) {
        owner.current = "guest";
        activeSession.current = null;
        rows.current = (await readValue<Annotation[]>("records:guest")) ?? [];
        setRecords(rows.current);
        setSession(null);
      }
    });
    const result = await supabase?.auth.signOut({ scope: "local" });
    if (result?.error) throw result.error;
  }
  async function sync() {
    if (Platform.OS !== "web") return;
    if (busy.current || !activeSession.current || !apiUrl || !online) return;
    busy.current = true;
    setSyncing(true);
    setSyncMessage("Syncing your library…");
    const scope = owner.current;
    try {
      const auth = await supabase!.auth.getSession();
      if (!auth.data.session) throw new Error("Sign in again to sync");
      if (owner.current !== scope || auth.data.session.user.id !== scope)
        return;
      // Send bounded batches; RPC returns a full snapshot, avoiding timestamp cursor gaps.
      let again = true;
      while (again) {
        if (owner.current !== scope) return;
        const pending = rows.current.filter((r) => r.dirty).slice(0, batchSize);
        const changes = pending.map(
          ({ dirty, revision, ...mutation }) => mutation,
        );
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        let result: SyncResponse;
        try {
          const response = await fetch(`${apiUrl.replace(/\/$/, "")}/v1/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth.data.session.access_token}`,
            },
            body: JSON.stringify({ changes }),
            signal: controller.signal,
          });
          if (!response.ok)
            throw new Error(
              response.status === 401
                ? "Sign in again to sync"
                : "Sync is unavailable. Please try again later.",
            );
          result = syncResponseSchema.parse(await response.json());
        } finally {
          clearTimeout(timeout);
        }
        const acknowledgements = new Set(result.acknowledged);
        const remoteIds = new Set(result.records.map((row) => row.id));
        if (
          pending.some(
            (row) =>
              !acknowledgements.has(row.mutation_id) || !remoteIds.has(row.id),
          )
        )
          throw new Error("Some changes were not saved. They will be retried.");
        await exclusive(async () => {
          if (owner.current === scope)
            await persistRows(mergeSync(rows.current, result));
        });
        again =
          owner.current === scope &&
          pending.length === batchSize &&
          rows.current.some((r) => r.dirty);
      }
      setSyncMessage(
        `Last synced ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      );
    } catch (e) {
      setSyncMessage(
        e instanceof Error
          ? e.message
          : "Sync is unavailable. Please try again later.",
      );
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }
  const dirtyKey = records
    .filter((r) => r.dirty)
    .map((r) => r.mutation_id)
    .join(",");
  const pending = records.filter((r) => r.dirty).length;
  useEffect(() => {
    if (Platform.OS !== "web" || !ready || !online || !session) return;
    const timer = setTimeout(() => void sync(), 1400);
    const interval = setInterval(() => void sync(), 60000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [ready, online, session?.user.id, dirtyKey, foreground]);
  const progress = records.find((r) => r.kind === "progress" && !r.deleted);
  return (
    <Context.Provider
      value={{
        ready,
        error,
        records,
        preferences,
        position: progress ?? start,
        session,
        online,
        syncing,
        syncMessage,
        pending,
        setPreferences,
        go,
        save,
        sync,
        clearAccount,
      }}
    >
      {children}
    </Context.Provider>
  );
}
