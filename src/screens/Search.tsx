import React, { useDeferredValue, useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import type { Passage } from "@allexi/shared";
import { reference } from "../data/bible";
import { useContent } from "../lib/content";
import {
  Card,
  Heading,
  Icon,
  Label,
  Txt,
  font,
  styles,
  useTheme,
} from "../components/ui";

export default function Search({ read }: { read: (p: Passage) => void }) {
  const { search } = useContent();
  const t = useTheme(),
    [query, setQuery] = useState(""),
    [scope, setScope] = useState("All");
  const deferred = useDeferredValue(query),
    results = useMemo(() => search(deferred, scope), [deferred, scope, search]);
  function match(text: string) {
    const q = deferred.trim();
    if (!q) return text;
    const at = text.toLowerCase().indexOf(q.toLowerCase());
    return at < 0 ? (
      text
    ) : (
      <>
        {text.slice(0, at)}
        <Txt
          serif
          style={{ backgroundColor: "#ECDBA7", color: "#253A2A", fontSize: 20 }}
        >
          {text.slice(at, at + q.length)}
        </Txt>
        {text.slice(at + q.length)}
      </>
    );
  }
  return (
    <View style={[styles.page, { flex: 1, paddingBottom: 0 }]}>
      <Heading
        title="Search the Scriptures"
        subtitle="Find a word, a phrase, or a place in the Word."
      />
      <View
        style={[
          styles.row,
          {
            backgroundColor: t.card,
            borderColor: t.line,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 16,
          },
        ]}
      >
        <Icon name="search" size={19} />
        <TextInput
          accessibilityLabel="Search scripture"
          placeholder="Try “born again” or John 3:16"
          placeholderTextColor={t.muted}
          value={query}
          onChangeText={setQuery}
          style={{
            flex: 1,
            minHeight: 54,
            color: t.text,
            fontFamily: font.sans,
            fontSize: 13,
          }}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>
      <View
        style={[styles.row, { marginVertical: 16, flexWrap: "wrap", gap: 8 }]}
      >
        {["All", "Old", "New", "Gospels"].map((s) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: s === scope }}
            key={s}
            onPress={() => setScope(s)}
            style={{
              minHeight: 44,
              paddingHorizontal: 16,
              justifyContent: "center",
              borderRadius: 5,
              backgroundColor: s === scope ? "#1E3A2F" : t.surface,
            }}
          >
            <Txt
              style={{ color: s === scope ? "#FBF9F5" : t.muted, fontSize: 11 }}
            >
              {s === "All"
                ? "All books"
                : s === "Gospels"
                  ? s
                  : `${s} Testament`}
            </Txt>
          </Pressable>
        ))}
      </View>
      {query.trim() ? (
        <Label style={{ marginBottom: 16 }}>
          {results.length} {results.length === 1 ? "PASSAGE" : "PASSAGES"} FOUND
        </Label>
      ) : (
        <View style={{ paddingVertical: 38, gap: 22 }}>
          <Icon name="search" size={32} />
          <Txt serif style={{ fontSize: 28 }}>
            Seek, and ye shall find.
          </Txt>
          <Txt muted>
            Find a passage, follow a thought, and read in context.
          </Txt>
          <View style={{ gap: 8 }}>
            <Label>PLACES TO BEGIN</Label>
            {["love", "peace", "John 3:16", "Psalm 23"].map((s) => (
              <Pressable
                key={s}
                accessibilityRole="button"
                onPress={() => setQuery(s)}
                style={[
                  styles.row,
                  {
                    minHeight: 44,
                    justifyContent: "space-between",
                    borderBottomWidth: 1,
                    borderColor: t.line,
                  },
                ]}
              >
                <Txt>{s}</Txt>
                <Icon name="arrow-up-left" size={16} />
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <FlatList
        data={results}
        keyExtractor={(v) => `${v.book}.${v.chapter}.${v.verse}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 12, paddingBottom: 30 }}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => read(item)}>
            <Card>
              <View
                style={[
                  styles.row,
                  { justifyContent: "space-between", marginBottom: 12 },
                ]}
              >
                <Label style={{ color: t.gold }}>
                  {reference(item).toUpperCase()}
                </Label>
                <Icon name="arrow-up-right" size={15} />
              </View>
              <Txt serif style={{ fontSize: 20, lineHeight: 30 }}>
                {match(item.text)}
              </Txt>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          query.trim() ? (
            <Txt muted>
              No passages found. Try a different phrase or reference.
            </Txt>
          ) : null
        }
      />
    </View>
  );
}
