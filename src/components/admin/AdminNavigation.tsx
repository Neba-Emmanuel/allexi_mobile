import React, { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { books } from "../../data/bible";
import type { ChapterProgress } from "../../../shared/src/content";
import { Card, Icon, Label, Txt, font, styles, useTheme } from "../ui";

export default function AdminNavigation({
  book,
  chapter,
  chapters,
  onChoose,
  disabled,
}: {
  book: number;
  chapter: number;
  chapters: ChapterProgress[];
  onChoose: (book: number, chapter: number) => void;
  disabled: boolean;
}) {
  const t = useTheme(),
    [query, setQuery] = useState("");
  const entries = books.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <View style={{ gap: 18 }}>
      <Card style={{ padding: 14 }}>
        <View
          style={[
            styles.row,
            {
              borderBottomWidth: 1,
              borderColor: t.line,
              paddingBottom: 10,
              marginBottom: 8,
            },
          ]}
        >
          <Icon name="search" size={15} />
          <TextInput
            accessibilityLabel="Find a Bible book"
            value={query}
            onChangeText={setQuery}
            placeholder="Find a book…"
            placeholderTextColor={t.muted}
            style={{
              minHeight: 36,
              flex: 1,
              fontFamily: font.sans,
              color: t.text,
              fontSize: 12,
            }}
          />
        </View>
        <ScrollView style={{ maxHeight: 310 }} nestedScrollEnabled>
          {entries.map((b) => {
            const rows = chapters.filter((c) => c.book === b.id),
              total = rows.reduce((n, c) => n + c.total, 0),
              updated = rows.reduce((n, c) => n + c.updated, 0);
            return (
              <Pressable
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${b.name}`}
                accessibilityState={{ selected: b.id === book }}
                key={b.id}
                onPress={() => onChoose(b.id, 1)}
                style={[
                  styles.row,
                  {
                    minHeight: 45,
                    paddingHorizontal: 10,
                    borderRadius: 5,
                    justifyContent: "space-between",
                    backgroundColor: b.id === book ? t.soft : "transparent",
                  },
                ]}
              >
                <Txt
                  style={{
                    fontSize: 12,
                    color: b.id === book ? t.green : t.text,
                  }}
                >
                  {b.name}
                </Txt>
                <Txt muted style={{ fontSize: 9 }}>
                  {total ? Math.round((updated / total) * 100) : 0}%
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </Card>
      <Card style={{ padding: 16, gap: 12 }}>
        <Label>{books[book].name.toUpperCase()} · CHAPTERS</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
          {chapters
            .filter((c) => c.book === book)
            .map((c) => (
              <Pressable
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${books[book].name} chapter ${c.chapter}`}
                accessibilityState={{ selected: c.chapter === chapter }}
                key={c.chapter}
                onPress={() => onChoose(book, c.chapter)}
                style={{
                  width: 43,
                  minHeight: 43,
                  borderRadius: 5,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: c.chapter === chapter ? 1 : 0,
                  borderColor: t.green,
                  backgroundColor: c.updated === c.total ? t.soft : t.surface,
                }}
              >
                <Txt
                  style={{
                    fontSize: 12,
                    color: c.updated === c.total ? t.green : t.text,
                  }}
                >
                  {c.chapter}
                </Txt>
                {c.updated > 0 ? (
                  <View
                    style={{
                      height: 3,
                      width: 20,
                      marginTop: 2,
                      borderRadius: 2,
                      backgroundColor: t.gold,
                    }}
                  />
                ) : null}
              </Pressable>
            ))}
        </View>
        <Txt muted style={{ fontSize: 10 }}>
          A gold mark indicates review progress.
        </Txt>
      </Card>
    </View>
  );
}
