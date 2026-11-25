import React, { useState } from "react";
import { FlatList, View, Pressable } from "react-native";
import type { Passage, Verse } from "@allexi/shared";
import { colors } from "@allexi/shared";
import { useContent } from "../lib/content";
import { useStore } from "../lib/store";
import { reference } from "../data/bible";
import {
  Card,
  Heading,
  Icon,
  IconButton,
  Label,
  Txt,
  styles,
  useTheme,
} from "../components/ui";

export default function Saved({
  read,
  edit,
}: {
  read: (p: Passage) => void;
  edit: (v: Verse) => void;
}) {
  const { bible } = useContent();
  const verseText = (p: Passage) =>
    bible.text(p) ||
    "This verse is awaiting publication in the Allexi edition.";
  const t = useTheme(),
    { records, save, session, syncMessage } = useStore(),
    [filter, setFilter] = useState("All");
  const entries = records
    .filter(
      (r) =>
        !r.deleted &&
        r.kind !== "progress" &&
        (filter === "All" || r.kind === filter),
    )
    .reverse();
  return (
    <View style={[styles.page, { flex: 1, paddingBottom: 0 }]}>
      <Heading
        title="Kept close to the heart."
        subtitle="Your highlights, saved passages, and quiet reflections."
      />
      <View
        style={[styles.row, { flexWrap: "wrap", marginBottom: 20, gap: 6 }]}
      >
        {["All", "highlight", "note", "bookmark"].map((f) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
            key={f}
            onPress={() => setFilter(f)}
            style={{
              minHeight: 44,
              paddingHorizontal: 15,
              justifyContent: "center",
              borderRadius: 5,
              backgroundColor: filter === f ? "#1E3A2F" : t.surface,
            }}
          >
            <Txt
              style={{
                fontSize: 11,
                color: filter === f ? "#FBF9F5" : t.muted,
              }}
            >
              {f === "All"
                ? "Everything"
                : f[0].toUpperCase() + f.slice(1) + "s"}
            </Txt>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={entries}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
        ListEmptyComponent={
          <Card style={{ paddingVertical: 40, alignItems: "center", gap: 16 }}>
            <Icon name="bookmark" size={28} />
            <Txt serif style={{ fontSize: 26 }}>
              A place for words that stay.
            </Txt>
            <Txt muted style={{ textAlign: "center" }}>
              Tap any verse in the reader to start your collection.
            </Txt>
          </Card>
        }
        renderItem={({ item }) => (
          <Card
            style={{
              borderLeftWidth: item.color ? 4 : 1,
              borderLeftColor: item.color ? colors[item.color] : t.line,
            }}
          >
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Label style={{ color: t.gold }}>
                {reference(item).toUpperCase()} · {item.kind.toUpperCase()}
              </Label>
              <IconButton
                name="trash-2"
                label={`Delete ${item.kind} for ${reference(item)}`}
                onPress={() =>
                  void save(item.kind, item, { deleted: true }).catch(() => {})
                }
              />
            </View>
            <Txt serif style={{ fontSize: 21, lineHeight: 32 }}>
              {verseText(item)}
            </Txt>
            {item.kind === "note" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => edit({ ...item, text: verseText(item) })}
                style={{
                  backgroundColor: t.surface,
                  padding: 14,
                  marginTop: 14,
                  borderRadius: 6,
                }}
              >
                <Txt style={{ fontSize: 13 }}>{item.text}</Txt>
                <Txt muted style={{ fontSize: 10, marginTop: 7 }}>
                  Tap to edit your reflection
                </Txt>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => read(item)}
              accessibilityLabel={`Read ${item.kind} for ${reference(item)}`}
              style={[styles.row, { minHeight: 44, marginTop: 8 }]}
            >
              <Txt style={{ fontSize: 11 }}>Read in context</Txt>
              <Icon name="arrow-right" size={14} />
            </Pressable>
          </Card>
        )}
      />
      <View
        style={[
          styles.row,
          { paddingVertical: 16, borderTopWidth: 1, borderColor: t.line },
        ]}
      >
        <Icon name={session ? "cloud" : "book-open"} size={16} />
        <Txt muted style={{ fontSize: 10, flex: 1 }}>
          {session ? syncMessage : "Your study, gathered here."}
        </Txt>
      </View>
    </View>
  );
}
