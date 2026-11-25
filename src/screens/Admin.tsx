import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { chapterVerses, names, books } from "../data/bible";
import {
  bundledContent,
  editionLabels,
  editionNames,
  previewOverview,
  type ContentOverview,
  type Edition,
  type EditorialChapter,
  type EditorialHistory,
} from "../../../allexi_backend/shared/src/content";
import { useStore } from "../lib/store";
import { adminRequest, ContentApiError, useContent } from "../lib/content";
import { apiUrl, supabase } from "../lib/auth";
import {
  Button,
  Card,
  Heading,
  Icon,
  IconButton,
  Label,
  Sheet,
  Txt,
  font,
  styles,
  useTheme,
} from "../components/ui";
import AdminNavigation from "../components/admin/AdminNavigation";
import AdminEditor, {
  type WorkingVerse,
} from "../components/admin/AdminEditor";

type Confirmation = { title: string; message: string; action: () => void };
export default function Admin({ onClose }: { onClose: () => void }) {
  const t = useTheme(),
    { session, preferences } = useStore(),
    content = useContent(),
    wide = useWindowDimensions().width >= 1000;
  const scope = session?.user.id ?? "guest",
    scopeRef = useRef(scope);
  scopeRef.current = scope;
  const [preview, setPreview] = useState(false),
    [access, setAccess] = useState({
      scope: "",
      allowed: false,
      checking: true,
      message: "",
    });
  const [edition, setEdition] = useState<Edition>("allexi"),
    [book, setBook] = useState(0),
    [chapter, setChapter] = useState(1),
    [selected, setSelected] = useState(1);
  const [overview, setOverview] = useState<ContentOverview | null>(null),
    [data, setData] = useState<EditorialChapter | null>(null),
    [working, setWorking] = useState<Record<number, WorkingVerse>>({});
  const [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [problem, setProblem] = useState(false),
    [reload, setReload] = useState(0);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null),
    [navigation, setNavigation] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false),
    [historyBusy, setHistoryBusy] = useState(false),
    [history, setHistory] = useState<EditorialHistory[]>([]);
  const allowed = access.scope === scope && access.allowed;
  const dirty = Object.keys(working).length;
  useEffect(() => {
    const controller = new AbortController();
    setAccess((current) =>
      current.scope === scope && current.allowed
        ? current
        : {
            scope,
            allowed: false,
            checking: !!session && !!supabase && !!apiUrl,
            message: "",
          },
    );
    if (!session || !supabase || !apiUrl) return;
    void adminRequest<{ admin: boolean }>("access", {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted)
          setAccess({
            scope,
            allowed: result.admin,
            checking: false,
            message: "",
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setAccess({
            scope,
            allowed: false,
            checking: false,
            message:
              error instanceof Error
                ? error.message
                : "Admin access could not be verified.",
          });
      });
    return () => controller.abort();
  }, [scope, session?.access_token]);
  useEffect(() => {
    if (!allowed && !preview) return;
    const controller = new AbortController();
    let live = true;
    setLoading(true);
    setData(null);
    setWorking({});
    setMessage("");
    setSelected(1);
    setHistoryOpen(false);
    setHistory([]);
    const query = `edition=${edition}&book=${book}&chapter=${chapter}`;
    const load = preview
      ? Promise.resolve([
          previewOverview(edition),
          {
            edition,
            book,
            chapter,
            verses: chapterVerses(book, chapter).map((v) => {
              const supplied = bundledContent.verses.find(
                (row) =>
                  row.edition === edition &&
                  row.book === book &&
                  row.chapter === chapter &&
                  row.verse === v.verse,
              );
              return {
                ...v,
                text: supplied?.text ?? (edition === "kjv" ? v.text : ""),
                status: supplied ? ("updated" as const) : ("pending" as const),
                revision: supplied?.revision ?? 0,
                updated_at: supplied?.published_at ?? null,
                updated_by: null,
                published_revision: supplied?.revision ?? null,
                published_text: supplied?.text ?? null,
              };
            }),
          },
        ] as const)
      : Promise.all([
          adminRequest<ContentOverview>(`content/overview?edition=${edition}`, {
            signal: controller.signal,
          }),
          adminRequest<EditorialChapter>(`content/chapter?${query}`, {
            signal: controller.signal,
          }),
        ]);
    void load
      .then(([summary, rows]) => {
        if (live) {
          setOverview(summary);
          setData(rows);
        }
      })
      .catch((error) => {
        if (live) {
          setProblem(true);
          setMessage(
            error instanceof Error
              ? error.message
              : "The chapter could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [allowed, preview, edition, book, chapter, reload, scope]);
  useEffect(() => {
    if (!historyOpen || !allowed || preview) return;
    const controller = new AbortController();
    setHistoryBusy(true);
    setHistory([]);
    void adminRequest<EditorialHistory[]>(
      `content/history?edition=${edition}&book=${book}&chapter=${chapter}&verse=${selected}`,
      { signal: controller.signal },
    )
      .then((rows) => {
        if (!controller.signal.aborted) setHistory(rows);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setProblem(true);
          setMessage(
            error instanceof Error
              ? error.message
              : "History could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryBusy(false);
      });
    return () => controller.abort();
  }, [
    historyOpen,
    selected,
    edition,
    book,
    chapter,
    allowed,
    preview,
    data?.verses,
  ]);

  function guard(action: () => void) {
    if (saving) return;
    if (dirty)
      setConfirmation({
        title: "Discard unsaved edits?",
        message:
          "These verse edits have not been saved. Stay here to save them, or discard them before continuing.",
        action,
      });
    else action();
  }
  function choose(nextBook: number, nextChapter: number) {
    if (nextBook === book && nextChapter === chapter) {
      setNavigation(false);
      return;
    }
    guard(() => {
      setBook(nextBook);
      setChapter(nextChapter);
      setNavigation(false);
    });
  }
  function change(verse: number, value: WorkingVerse) {
    if (preview || saving) return;
    setWorking((current) => {
      const original = data?.verses.find((v) => v.verse === verse),
        next = { ...current };
      if (
        original &&
        original.text === value.text &&
        (original.status === "updated" ? "updated" : "draft") === value.status
      )
        delete next[verse];
      else next[verse] = value;
      return next;
    });
    setMessage("");
  }
  function report(error: unknown) {
    setProblem(true);
    setMessage(
      error instanceof Error
        ? error.message
        : "The request could not be completed.",
    );
    if (
      error instanceof ContentApiError &&
      (error.status === 401 || error.status === 403)
    )
      setAccess({
        scope,
        allowed: false,
        checking: false,
        message: error.message,
      });
  }
  async function save() {
    if (!data || preview || saving) return;
    const changes = data.verses
      .filter((row) => working[row.verse])
      .map((row) => ({
        book,
        chapter,
        verse: row.verse,
        ...working[row.verse],
        expectedRevision: row.revision,
      }));
    if (changes.some((row) => !row.text.trim())) {
      setProblem(true);
      setMessage("Add wording for every changed verse before saving.");
      return;
    }
    const requestScope = scope;
    setSaving(true);
    setMessage("");
    try {
      const rows = await adminRequest<EditorialChapter>("content/chapter", {
        method: "PUT",
        body: { edition, book, chapter, changes },
      });
      if (scopeRef.current !== requestScope) return;
      setData(rows);
      setWorking({});
      setProblem(false);
      setMessage(
        `${changes.length} ${changes.length === 1 ? "verse saved" : "verses saved"}. Publish reviewed verses when they are ready for readers.`,
      );
      setOverview(
        await adminRequest<ContentOverview>(
          `content/overview?edition=${edition}`,
        ),
      );
    } catch (error) {
      if (scopeRef.current === requestScope) report(error);
    } finally {
      setSaving(false);
    }
  }
  async function publish() {
    if (!data || preview || saving || dirty) return;
    const revisions = data.verses
      .filter(
        (v) => v.status === "updated" && v.published_revision !== v.revision,
      )
      .map((v) => ({ verse: v.verse, revision: v.revision }));
    const requestScope = scope;
    setSaving(true);
    setMessage("");
    try {
      const rows = await adminRequest<EditorialChapter>("content/publish", {
        method: "POST",
        body: { edition, book, chapter, revisions },
      });
      if (scopeRef.current !== requestScope) return;
      setData(rows);
      setOverview(
        await adminRequest<ContentOverview>(
          `content/overview?edition=${edition}`,
        ),
      );
      await content.refresh();
      setProblem(false);
      setMessage(
        `${revisions.length} reviewed ${revisions.length === 1 ? "verse is" : "verses are"} now published.`,
      );
    } catch (error) {
      if (scopeRef.current === requestScope) report(error);
    } finally {
      setSaving(false);
    }
  }
  async function makeDefault() {
    if (!overview || preview || saving) return;
    const requestScope = scope;
    setSaving(true);
    setMessage("");
    try {
      const next = await adminRequest<ContentOverview>(
        "content/default-edition",
        {
          method: "PUT",
          body: { edition, expectedRevision: overview.revision },
        },
      );
      if (scopeRef.current !== requestScope) return;
      setOverview(next);
      await content.refresh();
      setProblem(false);
      setMessage(
        `${editionNames[edition]} is now the reader’s default edition.`,
      );
    } catch (error) {
      if (scopeRef.current === requestScope) report(error);
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: 24,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: t.line,
          justifyContent: "space-between",
        },
      ]}
    >
      <View style={styles.row}>
        <IconButton
          name="arrow-left"
          label="Exit admin workspace"
          onPress={() => guard(onClose)}
        />
        <View>
          <Label style={{ color: t.gold }}>ALLEXI BIBLE</Label>
          <Txt serif style={{ fontSize: 23, lineHeight: 29 }}>
            Editorial workspace
          </Txt>
        </View>
      </View>
      <View style={styles.row}>
        {preview ? <Label>PREVIEW</Label> : <Icon name="shield" size={19} />}
        <IconButton
          name="refresh-cw"
          label="Reload admin content"
          onPress={() => guard(() => setReload((n) => n + 1))}
        />
      </View>
    </View>
  );
  if (!preview && !allowed)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <StatusBar style={preferences.dark ? "light" : "dark"} />
        {header}
        <ScrollView
          contentContainerStyle={[
            styles.page,
            { maxWidth: 650, paddingTop: 48 },
          ]}
        >
          <Heading
            title="A place for careful stewardship."
            subtitle="Administrator access is required to edit scripture."
          />
          <Card style={{ gap: 20 }}>
            <Icon name="shield" size={30} />
            {access.checking ? (
              <>
                <ActivityIndicator color={t.green} />
                <Txt muted>Checking administrator access…</Txt>
              </>
            ) : (
              <>
                <Txt style={{ fontSize: 14, lineHeight: 25 }}>
                  {access.message ||
                    (!supabase || !apiUrl
                      ? "Connect the Supabase project and Node API to enable the editorial workspace."
                      : "Sign in with an administrator account in Settings. An account must be granted editor access before it can manage scripture.")}
                </Txt>
                <Button onPress={onClose} icon="arrow-left">
                  Return to settings
                </Button>
                <Button secondary onPress={() => setPreview(true)}>
                  Preview the editor
                </Button>
                <Txt muted style={{ fontSize: 11 }}>
                  Preview is read-only and shows the workflow without accessing
                  saved editorial work.
                </Txt>
              </>
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>
    );

  const chapters =
    overview?.edition === edition
      ? overview.chapters
      : previewOverview(edition).chapters;
  const totals = chapters.reduce(
    (sum, row) => ({
      total: sum.total + row.total,
      updated: sum.updated + row.updated,
      draft: sum.draft + row.draft,
      published: sum.published + row.published,
    }),
    { total: 0, updated: 0, draft: 0, published: 0 },
  );
  const bookRows = chapters.filter((row) => row.book === book),
    bookTotal = bookRows.reduce((n, c) => n + c.total, 0),
    bookUpdated = bookRows.reduce((n, c) => n + c.updated, 0);
  const navigationView = (
    <AdminNavigation
      book={book}
      chapter={chapter}
      chapters={chapters}
      onChoose={choose}
      disabled={saving}
    />
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={preferences.dark ? "light" : "dark"} />
      {header}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.page,
          { maxWidth: 1500, gap: 22, paddingBottom: 50 },
        ]}
      >
        <View>
          <Label style={{ color: t.gold, marginBottom: 10 }}>
            SCRIPTURE MANAGEMENT
          </Label>
          <Heading
            title="Every word, considered."
            subtitle="Shape the wording, track review progress, and publish with care."
          />
          <View
            style={[
              styles.row,
              { flexWrap: "wrap", justifyContent: "space-between" },
            ]}
          >
            <View style={styles.row}>
              {(["kjv", "allexi"] as const).map((e) => (
                <Button
                  key={e}
                  secondary={edition !== e}
                  disabled={saving}
                  onPress={() => {
                    if (e !== edition) guard(() => setEdition(e));
                  }}
                >
                  {editionNames[e]}
                </Button>
              ))}
            </View>
            <Label>EDITING {editionLabels[edition]}</Label>
          </View>
        </View>
        {preview ? (
          <Card style={{ backgroundColor: t.surface, padding: 16 }}>
            <Txt style={{ fontSize: 12 }}>
              Read-only preview · Connect an administrator account to save,
              publish, and see real progress.
            </Txt>
          </Card>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[
            {
              name: "Updated",
              value: totals.updated,
              icon: "check-circle" as const,
            },
            {
              name: "Still to update",
              value: totals.total - totals.updated,
              icon: "circle" as const,
            },
            { name: "Drafts", value: totals.draft, icon: "edit-3" as const },
            {
              name: edition === "kjv" ? "Published edits" : "Published verses",
              value: totals.published,
              icon: "upload-cloud" as const,
            },
          ].map((stat) => (
            <Card
              key={stat.name}
              style={{ flex: 1, minWidth: 145, gap: 12, padding: 18 }}
            >
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <Label style={{ letterSpacing: 1, fontSize: 9 }}>
                  {stat.name.toUpperCase()}
                </Label>
                <Icon name={stat.icon} size={16} />
              </View>
              <Txt serif style={{ fontSize: 34, lineHeight: 40 }}>
                {stat.value.toLocaleString()}
              </Txt>
            </Card>
          ))}
        </View>
        <Card style={{ backgroundColor: t.surface, padding: 18, gap: 14 }}>
          <View
            style={[
              styles.row,
              { justifyContent: "space-between", flexWrap: "wrap" },
            ]}
          >
            <View style={{ flex: 1, minWidth: 210, gap: 5 }}>
              <Txt serif style={{ fontSize: 23 }}>
                Reader default ·{" "}
                {editionNames[overview?.defaultEdition ?? "kjv"]}
              </Txt>
              <Txt muted style={{ fontSize: 11 }}>
                New readers follow this edition unless they choose another. Only
                published Allexi verses are shown.
              </Txt>
            </View>
            <Button
              secondary
              disabled={
                preview ||
                saving ||
                dirty > 0 ||
                overview?.defaultEdition === edition ||
                (edition === "allexi" && !totals.published)
              }
              onPress={() =>
                setConfirmation({
                  title: "Change the reader’s default?",
                  message: `Set ${editionNames[edition]} as the default for readers? ${edition === "allexi" ? `${totals.published.toLocaleString()} Allexi verses are published. Other Allexi passages will be shown as awaiting publication.` : "KJV source wording remains available alongside published KJV edits."}`,
                  action: () => void makeDefault(),
                })
              }
            >
              Make {editionLabels[edition]} the default
            </Button>
          </View>
          <View style={{ height: 3, backgroundColor: t.line, borderRadius: 3 }}>
            <View
              style={{
                height: 3,
                width: `${totals.total ? (totals.updated / totals.total) * 100 : 0}%`,
                backgroundColor: t.gold,
              }}
            />
          </View>
          <Txt muted style={{ fontSize: 10 }}>
            {totals.updated.toLocaleString()} of {totals.total.toLocaleString()}{" "}
            verses updated ·{" "}
            {totals.total
              ? Math.round((totals.updated / totals.total) * 100)
              : 0}
            % reviewed
          </Txt>
        </Card>
        {message ? (
          <View
            accessibilityRole="alert"
            style={{
              borderWidth: 1,
              borderColor: problem ? t.gold : t.line,
              backgroundColor: t.surface,
              padding: 16,
              borderRadius: 6,
            }}
          >
            <Txt style={{ fontSize: 12, lineHeight: 22 }}>{message}</Txt>
          </View>
        ) : null}
        {!wide ? (
          <Button secondary icon="grid" onPress={() => setNavigation(true)}>
            {names[book]} · Chapter {chapter} · Choose passage
          </Button>
        ) : null}
        <View
          style={{
            flexDirection: wide ? "row" : "column",
            gap: 24,
            alignItems: wide ? "flex-start" : "stretch",
          }}
        >
          {wide ? (
            <View style={{ width: 235, gap: 12 }}>
              <View>
                <Label>
                  {bookUpdated}/{bookTotal} UPDATED
                </Label>
                <Txt serif style={{ fontSize: 23 }}>
                  {names[book]}
                </Txt>
              </View>
              {navigationView}
            </View>
          ) : null}
          {loading ? (
            <Card
              style={{
                flex: 1,
                minHeight: 300,
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
              }}
            >
              <ActivityIndicator color={t.green} />
              <Txt muted>Opening chapter…</Txt>
            </Card>
          ) : data &&
            data.edition === edition &&
            data.book === book &&
            data.chapter === chapter ? (
            <AdminEditor
              key={`${edition}.${book}.${chapter}`}
              data={data}
              working={working}
              selected={selected}
              onSelect={setSelected}
              onChange={change}
              onSave={() => void save()}
              onPublish={() =>
                setConfirmation({
                  title: "Publish reviewed verses?",
                  message:
                    "The saved wording of the updated verses in this chapter will become available to readers. Drafts and pending verses are excluded.",
                  action: () => void publish(),
                })
              }
              saving={saving}
              readOnly={preview}
              history={history.filter(
                (h) =>
                  h.verse === selected &&
                  h.edition === edition &&
                  h.book === book &&
                  h.chapter === chapter,
              )}
              onHistory={() => setHistoryOpen((value) => !value)}
              historyBusy={historyBusy}
              historyOpen={historyOpen}
            />
          ) : (
            <Card style={{ flex: 1 }}>
              <Txt muted>
                The chapter could not be opened. Use Reload to try again.
              </Txt>
            </Card>
          )}
        </View>
      </ScrollView>
      <Sheet
        visible={navigation || !!confirmation}
        title={confirmation?.title ?? "Choose a chapter"}
        onClose={() => {
          setConfirmation(null);
          setNavigation(false);
        }}
      >
        {confirmation ? (
          <>
            <Txt style={{ fontSize: 14, lineHeight: 25 }}>
              {confirmation.message}
            </Txt>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              <Button secondary onPress={() => setConfirmation(null)}>
                Cancel
              </Button>
              <Button
                onPress={() => {
                  const action = confirmation.action;
                  setConfirmation(null);
                  action();
                }}
              >
                Continue
              </Button>
            </View>
          </>
        ) : (
          navigationView
        )}
      </Sheet>
    </SafeAreaView>
  );
}
