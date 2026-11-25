import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import type {
  EditorialChapter,
  EditorialHistory,
} from "../../../shared/src/content";
import { chapterVerses, names, reference } from "../../data/bible";
import { Button, Card, Icon, Label, Txt, font, styles, useTheme } from "../ui";

export type WorkingVerse = { text: string; status: "draft" | "updated" };
export default function AdminEditor({
  data,
  working,
  selected,
  onSelect,
  onChange,
  onSave,
  onPublish,
  saving,
  readOnly,
  history,
  onHistory,
  historyBusy,
  historyOpen,
}: {
  data: EditorialChapter;
  working: Record<number, WorkingVerse>;
  selected: number;
  onSelect: (verse: number) => void;
  onChange: (verse: number, change: WorkingVerse) => void;
  onSave: () => void;
  onPublish: () => void;
  saving: boolean;
  readOnly: boolean;
  history: EditorialHistory[];
  onHistory: () => void;
  historyBusy: boolean;
  historyOpen: boolean;
}) {
  const t = useTheme(),
    wide = useWindowDimensions().width >= 1100,
    [filter, setFilter] = useState("all");
  const rows = useMemo(
    () =>
      data.verses.map((row) => ({
        ...row,
        ...working[row.verse],
        unsaved: !!working[row.verse],
      })),
    [data, working],
  );
  const shown = rows.filter(
    (r) =>
      filter === "all" ||
      (filter === "pending" ? r.status !== "updated" : r.status === filter),
  );
  const row = rows.find((r) => r.verse === selected) ?? rows[0];
  const original = chapterVerses(data.book, data.chapter).find(
    (v) => v.verse === row?.verse,
  );
  const publishable = data.verses.filter(
    (r) => r.status === "updated" && r.published_revision !== r.revision,
  );
  const dirty = Object.keys(working).length;
  if (!row) return null;
  const status =
    row.status === "updated"
      ? "Updated"
      : row.status === "draft"
        ? "Draft"
        : "Still to update";
  const changeText = (text: string) =>
    onChange(row.verse, { text, status: "draft" });
  return (
    <View style={{ gap: 18, flex: 1, minWidth: 0 }}>
      <View
        style={[
          styles.row,
          { justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
        ]}
      >
        <View>
          <Txt serif style={{ fontSize: 30, lineHeight: 38 }}>
            {names[data.book]} · {data.chapter}
          </Txt>
          <Txt muted style={{ fontSize: 11 }}>
            {data.verses.filter((v) => v.status === "updated").length} of{" "}
            {data.verses.length} verses updated
            {dirty
              ? ` · ${dirty} unsaved ${dirty === 1 ? "verse" : "verses"}`
              : ""}
          </Txt>
        </View>
        <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
          <Button
            disabled={readOnly || saving || !dirty}
            onPress={onSave}
            icon="save"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            secondary
            disabled={readOnly || saving || !!dirty || !publishable.length}
            onPress={onPublish}
            icon="upload"
          >
            Publish updated ({publishable.length})
          </Button>
        </View>
      </View>
      <View style={[styles.row, { flexWrap: "wrap", gap: 6 }]}>
        {[
          { id: "all", name: "All verses" },
          { id: "pending", name: "Still to update" },
          { id: "updated", name: "Updated" },
          { id: "draft", name: "Drafts" },
        ].map((f) => (
          <Pressable
            key={f.id}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.id }}
            onPress={() => setFilter(f.id)}
            style={{
              minHeight: 44,
              paddingHorizontal: 14,
              borderRadius: 5,
              justifyContent: "center",
              backgroundColor: filter === f.id ? "#1E3A2F" : t.surface,
            }}
          >
            <Txt
              style={{
                fontSize: 11,
                color: filter === f.id ? "#FBF9F5" : t.text,
              }}
            >
              {f.name}
            </Txt>
          </Pressable>
        ))}
      </View>
      <View
        style={{
          flexDirection: wide ? "row" : "column",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        <Card style={{ width: wide ? 205 : undefined, padding: 10 }}>
          <ScrollView
            horizontal={!wide}
            nestedScrollEnabled
            style={{ maxHeight: wide ? 600 : 100 }}
            contentContainerStyle={{ gap: 5 }}
          >
            {shown.map((v) => (
              <Pressable
                disabled={saving}
                key={v.verse}
                accessibilityRole="button"
                accessibilityLabel={`Edit verse ${v.verse}`}
                accessibilityState={{ selected: v.verse === row.verse }}
                onPress={() => onSelect(v.verse)}
                style={{
                  padding: 12,
                  minWidth: wide ? undefined : 85,
                  minHeight: 64,
                  borderRadius: 5,
                  backgroundColor:
                    v.verse === row.verse ? t.soft : "transparent",
                  gap: 3,
                }}
              >
                <View style={[styles.row, { gap: 7 }]}>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor:
                        v.status === "updated"
                          ? t.green
                          : v.status === "draft"
                            ? t.gold
                            : t.line,
                    }}
                  />
                  <Txt style={{ fontFamily: font.bold, fontSize: 12 }}>
                    Verse {v.verse}
                    {v.unsaved ? " •" : ""}
                  </Txt>
                </View>
                <Txt muted style={{ fontSize: 9 }}>
                  {v.status === "updated"
                    ? "Updated"
                    : v.status === "draft"
                      ? "Draft"
                      : "Pending"}
                </Txt>
              </Pressable>
            ))}
            {!shown.length ? (
              <Txt muted style={{ padding: 12, fontSize: 12 }}>
                No verses in this filter.
              </Txt>
            ) : null}
          </ScrollView>
        </Card>
        <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
          <Card style={{ gap: 18 }}>
            <View
              style={[
                styles.row,
                { justifyContent: "space-between", flexWrap: "wrap" },
              ]}
            >
              <Label style={{ color: t.gold }}>
                {reference(row).toUpperCase()}
              </Label>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 4,
                  backgroundColor:
                    row.status === "updated" ? t.soft : t.surface,
                }}
              >
                <Txt style={{ fontSize: 10 }}>
                  {status}
                  {row.unsaved ? " · Unsaved" : ""}
                </Txt>
              </View>
            </View>
            <View
              style={{
                backgroundColor: t.surface,
                borderRadius: 6,
                padding: 16,
                gap: 8,
              }}
            >
              <Label>KJV SOURCE</Label>
              <Txt serif style={{ fontSize: 21, lineHeight: 32 }}>
                {original?.text}
              </Txt>
            </View>
            <View style={{ gap: 10 }}>
              <Label>
                {data.edition === "allexi"
                  ? "ALLEXI WORDING"
                  : "KJV EDITION WORDING"}
              </Label>
              <TextInput
                accessibilityLabel="Verse text"
                editable={!readOnly && !saving}
                multiline
                textAlignVertical="top"
                maxLength={20000}
                value={row.text}
                onChangeText={changeText}
                placeholder={
                  data.edition === "allexi"
                    ? "Write the Allexi wording for this verse…"
                    : "Edit the verse wording…"
                }
                placeholderTextColor={t.muted}
                style={[
                  styles.input,
                  {
                    minHeight: 200,
                    borderColor: t.line,
                    backgroundColor: t.bg,
                    color: t.text,
                    fontFamily: font.serif,
                    fontSize: 22,
                    lineHeight: 34,
                  },
                ]}
              />
              {data.edition === "allexi" ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={readOnly || saving}
                  onPress={() => changeText(original?.text ?? "")}
                  style={[styles.row, { minHeight: 44 }]}
                >
                  <Icon name="copy" size={14} />
                  <Txt muted style={{ fontSize: 11 }}>
                    Use KJV as a starting point
                  </Txt>
                </Pressable>
              ) : null}
            </View>
            <View
              style={[
                styles.row,
                {
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderColor: t.line,
                  paddingTop: 14,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Txt style={{ fontFamily: font.bold, fontSize: 12 }}>
                  Mark this verse updated
                </Txt>
                <Txt muted style={{ fontSize: 10 }}>
                  Confirm its wording has been reviewed, then save.
                </Txt>
              </View>
              <Switch
                accessibilityLabel="Mark verse updated"
                disabled={readOnly || saving || !row.text.trim()}
                value={row.status === "updated"}
                onValueChange={(value) =>
                  onChange(row.verse, {
                    text: row.text,
                    status: value ? "updated" : "draft",
                  })
                }
                trackColor={{ false: t.line, true: "#52735C" }}
                thumbColor="#FBF9F5"
              />
            </View>
            <Txt muted style={{ fontSize: 10 }}>
              {row.published_revision === row.revision &&
              row.published_revision !== null
                ? "This saved revision is published."
                : row.published_revision !== null
                  ? "Readers still see the previous published revision."
                  : "This verse has no published edits."}
              {row.updated_at
                ? ` Last saved ${new Date(row.updated_at).toLocaleString()}.`
                : ""}
            </Txt>
          </Card>
          <Card style={{ padding: 18, gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show verse history"
              onPress={onHistory}
              disabled={readOnly || saving}
              style={[
                styles.row,
                { justifyContent: "space-between", minHeight: 44 },
              ]}
            >
              <View style={styles.row}>
                <Icon name="clock" size={17} />
                <Txt serif style={{ fontSize: 23 }}>
                  Revision history
                </Txt>
              </View>
              <Icon
                name={historyOpen ? "chevron-up" : "chevron-down"}
                size={17}
              />
            </Pressable>
            {historyOpen ? (
              <>
                {historyBusy ? (
                  <Txt muted>Loading history…</Txt>
                ) : history.length ? (
                  history.map((event) => (
                    <View
                      key={event.id}
                      style={{
                        borderTopWidth: 1,
                        borderColor: t.line,
                        paddingTop: 14,
                        gap: 7,
                      }}
                    >
                      <Label>
                        {event.action === "publish"
                          ? "PUBLISHED"
                          : event.action === "mark_updated"
                            ? "MARKED UPDATED"
                            : "DRAFT SAVED"}{" "}
                        · REVISION {event.revision}
                      </Label>
                      <Txt muted style={{ fontSize: 10 }}>
                        {new Date(event.created_at).toLocaleString()} ·{" "}
                        {event.actor_id
                          ? `Admin ${event.actor_id.slice(0, 8)}`
                          : "Content import / removed account"}
                      </Txt>
                      <Txt serif style={{ fontSize: 18, lineHeight: 28 }}>
                        {event.after_text}
                      </Txt>
                      {event.after_text ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => changeText(event.after_text!)}
                          style={{ minHeight: 44, justifyContent: "center" }}
                        >
                          <Txt style={{ fontSize: 11, color: t.gold }}>
                            Use this text in a new draft
                          </Txt>
                        </Pressable>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Txt muted style={{ fontSize: 12 }}>
                    No saved revisions for this verse yet.
                  </Txt>
                )}
              </>
            ) : null}
          </Card>
        </View>
      </View>
    </View>
  );
}
