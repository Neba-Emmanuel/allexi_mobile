import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import * as Clipboard from "expo-clipboard";
import { colors, type Passage, type Verse } from "../../shared/src/index";
import { books, reference } from "../data/bible";
import { useContent, readerEditionLabels } from "../lib/content";
import { useStore } from "../lib/store";
import { Button, Icon, Label, Sheet, Txt, font, styles, useTheme } from "./ui";

export function BookSelector({
  visible,
  initialTestament,
  onClose,
  onSelect,
}: {
  visible: boolean;
  initialTestament: "Old" | "New";
  onClose: () => void;
  onSelect: (p: Passage) => void;
}) {
  const t = useTheme(),
    { position } = useStore(),
    [testament, setTestament] = useState(initialTestament),
    [book, setBook] = useState(position.book);
  useEffect(() => {
    if (visible) {
      setTestament(initialTestament);
      setBook(
        initialTestament === "Old"
          ? Math.min(position.book, 38)
          : Math.max(position.book, 39),
      );
    }
  }, [visible, initialTestament]);
  return (
    <Sheet visible={visible} title="Find your passage" onClose={onClose}>
      <View style={styles.row}>
        {(["Old", "New"] as const).map((s) => (
          <Button
            key={s}
            secondary={s !== testament}
            onPress={() => {
              setTestament(s);
              setBook(s === "Old" ? 0 : 39);
            }}
          >
            {s} Testament
          </Button>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
        <View style={{ width: "43%" }}>
          {books
            .filter((b) => b.testament === testament)
            .map((b) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: b.id === book }}
                key={b.id}
                onPress={() => setBook(b.id)}
                style={{
                  minHeight: 44,
                  padding: 10,
                  borderRadius: 4,
                  backgroundColor: b.id === book ? t.soft : "transparent",
                }}
              >
                <Txt
                  style={{
                    fontSize: 12,
                    color: b.id === book ? t.green : t.muted,
                  }}
                >
                  {b.name}
                </Txt>
              </Pressable>
            ))}
        </View>
        <View style={{ flex: 1, gap: 14 }}>
          <Label>{books[book].name.toUpperCase()} · CHAPTER</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
            {Array.from({ length: books[book].chapters }, (_, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${books[book].name} chapter ${i + 1}`}
                onPress={() => {
                  onSelect({ book, chapter: i + 1, verse: 1 });
                  onClose();
                }}
                style={{
                  width: 46,
                  minHeight: 46,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    position.book === book && position.chapter === i + 1
                      ? t.soft
                      : t.surface,
                  borderRadius: 5,
                }}
              >
                <Txt style={{ fontSize: 13 }}>{i + 1}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Sheet>
  );
}
export function VerseActions({
  verse,
  onClose,
}: {
  verse: Verse | null;
  onClose: () => void;
}) {
  const { edition, editionName, bible } = useContent();
  const selectedText = verse ? bible.text(verse) : "";
  const t = useTheme(),
    { records, save } = useStore(),
    [copied, setCopied] = useState(false),
    [saveState, setSaveState] = useState("");
  const note = records.find(
    (r) =>
      r.kind === "note" &&
      !r.deleted &&
      r.book === verse?.book &&
      r.chapter === verse?.chapter &&
      r.verse === verse?.verse,
  );
  const [draft, setDraft] = useState("");
  const editVersion = useRef(0);
  useEffect(() => {
    setDraft(note?.text ?? "");
    setCopied(false);
    setSaveState("");
  }, [verse?.book, verse?.chapter, verse?.verse]);
  const bookmark = records.some(
    (r) =>
      r.kind === "bookmark" &&
      !r.deleted &&
      r.book === verse?.book &&
      r.chapter === verse?.chapter &&
      r.verse === verse?.verse,
  );
  const highlight = records.find(
    (r) =>
      r.kind === "highlight" &&
      !r.deleted &&
      r.book === verse?.book &&
      r.chapter === verse?.chapter &&
      r.verse === verse?.verse,
  );
  async function updateNote(text: string) {
    if (!verse) return;
    setDraft(text);
    setSaveState("Saving…");
    const version = ++editVersion.current;
    try {
      await save("note", verse, { text, deleted: !text.trim() });
      if (version === editVersion.current) setSaveState("Saved");
    } catch {
      setSaveState("Could not save. Please try again.");
    }
  }
  return (
    <Sheet
      visible={!!verse}
      title={verse ? reference(verse) : "Verse"}
      onClose={onClose}
    >
      {verse ? (
        <>
          <Label>{editionName.toUpperCase()}</Label>
          <Txt serif style={{ fontSize: 24, lineHeight: 36 }}>
            {selectedText ||
              "This verse is awaiting publication in the Allexi edition."}
          </Txt>
          <View style={styles.row}>
            <Button
              secondary
              icon="bookmark"
              onPress={() =>
                void save("bookmark", verse, { deleted: bookmark }).catch(
                  () => {},
                )
              }
            >
              {bookmark ? "Bookmarked" : "Bookmark"}
            </Button>
            <Button
              secondary
              icon="copy"
              disabled={!selectedText}
              onPress={() =>
                void Clipboard.setStringAsync(
                  `${selectedText} — ${reference(verse)} (${readerEditionLabels[edition]})`,
                )
                  .then(() => setCopied(true))
                  .catch(() => setSaveState("Copy unavailable"))
              }
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </View>
          <View>
            <Label style={{ marginBottom: 12 }}>
              A LITTLE LIGHT IN THE MARGIN
            </Label>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {(Object.entries(colors) as [keyof typeof colors, string][]).map(
                ([key, color]) => (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`${key} highlight`}
                    accessibilityState={{ selected: highlight?.color === key }}
                    onPress={() =>
                      void save("highlight", verse, {
                        color: key,
                        deleted: false,
                      }).catch(() => {})
                    }
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: color,
                      borderWidth: highlight?.color === key ? 2 : 0,
                      borderColor: t.green,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {highlight?.color === key ? (
                      <Icon name="check" color="#1E3A2F" size={18} />
                    ) : null}
                  </Pressable>
                ),
              )}
              {highlight ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    void save("highlight", verse, { deleted: true }).catch(
                      () => {},
                    )
                  }
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Txt muted style={{ fontSize: 11 }}>
                    Remove
                  </Txt>
                </Pressable>
              ) : null}
            </View>
          </View>
          <View>
            <Label style={{ marginBottom: 10 }}>YOUR REFLECTION</Label>
            <TextInput
              accessibilityLabel="Your reflection"
              maxLength={20000}
              multiline
              value={draft}
              onChangeText={(text) => void updateNote(text)}
              placeholder="What is this passage saying to you?"
              placeholderTextColor={t.muted}
              textAlignVertical="top"
              style={[
                styles.input,
                {
                  minHeight: 140,
                  color: t.text,
                  borderColor: t.line,
                  backgroundColor: t.surface,
                  lineHeight: 24,
                },
              ]}
            />
            <Txt muted style={{ fontSize: 10, marginTop: 8 }}>
              {saveState || "Notes save automatically."}
            </Txt>
          </View>
          <View
            style={{ padding: 16, backgroundColor: t.surface, borderRadius: 6 }}
          >
            <Label>ABOUT THIS EDITION</Label>
            <Txt muted style={{ fontSize: 12, marginTop: 6 }}>
              {editionName}
              {edition === "kjv" ? " · Modern spelling" : ""}
            </Txt>
          </View>
        </>
      ) : null}
    </Sheet>
  );
}
export function Appearance({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const t = useTheme(),
    { preferences: p, setPreferences } = useStore();
  return (
    <Sheet visible={visible} title="Make yourself at home" onClose={onClose}>
      <Label>READING THEME</Label>
      <View style={styles.row}>
        <Button
          secondary={p.dark}
          onPress={() => setPreferences({ dark: false })}
          icon="sun"
        >
          Warm ivory
        </Button>
        <Button
          secondary={!p.dark}
          onPress={() => setPreferences({ dark: true })}
          icon="moon"
        >
          Sanctuary
        </Button>
      </View>
      <Label>TYPEFACE</Label>
      <View style={styles.row}>
        <Button
          secondary={p.sans}
          onPress={() => setPreferences({ sans: false })}
        >
          Literary serif
        </Button>
        <Button
          secondary={!p.sans}
          onPress={() => setPreferences({ sans: true })}
        >
          Simple sans
        </Button>
      </View>
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <Label>TEXT SIZE · {p.fontSize} PT</Label>
        <View style={styles.row}>
          <Button
            secondary
            disabled={p.fontSize <= 14}
            onPress={() =>
              setPreferences({ fontSize: Math.max(14, p.fontSize - 1) })
            }
          >
            −
          </Button>
          <Button
            secondary
            disabled={p.fontSize >= 26}
            onPress={() =>
              setPreferences({ fontSize: Math.min(26, p.fontSize + 1) })
            }
          >
            +
          </Button>
        </View>
      </View>
      <Label>LINE SPACING</Label>
      <View style={styles.row}>
        {[1.5, 1.75, 2].map((n) => (
          <Button
            key={n}
            secondary={p.lineHeight !== n}
            onPress={() => setPreferences({ lineHeight: n })}
          >
            {n === 1.5 ? "Compact" : n === 1.75 ? "Balanced" : "Airy"}
          </Button>
        ))}
      </View>
      <Txt
        style={{
          fontFamily: p.sans ? font.sans : font.serif,
          fontSize: p.fontSize,
          lineHeight: p.fontSize * p.lineHeight,
          color: t.text,
        }}
      >
        Thy word is a lamp unto my feet, and a light unto my path.
      </Txt>
    </Sheet>
  );
}
