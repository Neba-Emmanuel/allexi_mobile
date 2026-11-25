import React from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import type { Passage } from "../../shared/src/index";
import { useContent, readerEditionLabels } from "../lib/content";
import { useStore } from "../lib/store";
import { books, names, reference } from "../data/bible";
import {
  Button,
  Card,
  Icon,
  Label,
  SectionTitle,
  Txt,
  font,
  styles,
  useTheme,
} from "../components/ui";
import Landscape from "../components/Landscape";
import { useDailyContemplation } from "../lib/useDailyContemplation";

export default function Home({
  read,
  select,
  showSaved,
}: {
  read: (p: Passage) => void;
  select: (testament: "Old" | "New") => void;
  showSaved: () => void;
}) {
  const { bible, edition, editionName } = useContent();
  const verseText = bible.text;
  const t = useTheme(),
    { position, records } = useStore(),
    wide = useWindowDimensions().width > 1000;
  const recent = records
    .filter((r) => r.kind !== "progress" && !r.deleted)
    .slice(-3)
    .reverse();
  const { date: today, passage: day } = useDailyContemplation();
  const date = today
    .toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
  return (
    <View style={styles.page}>
      <Label style={{ color: t.gold, marginBottom: 10 }}>{date}</Label>
      <Txt serif style={{ fontSize: 43, lineHeight: 52 }}>
        A quiet place for the Word.
      </Txt>
      <Txt muted style={{ marginTop: 6, marginBottom: 30, fontSize: 13 }}>
        Pause. Read. Let the words take root.
      </Txt>
      <View
        style={{
          flexDirection: wide ? "row" : "column",
          gap: 24,
          alignItems: "stretch",
        }}
      >
        <View style={{ flex: wide ? 1.2 : undefined, gap: 26 }}>
          <View
            style={{
              backgroundColor: "#1E3A2F",
              borderRadius: 10,
              padding: 26,
              overflow: "hidden",
            }}
          >
            <View
              style={[
                styles.row,
                { justifyContent: "space-between", marginBottom: 24 },
              ]}
            >
              <Label style={{ color: "#D9C58D" }}>
                PICK UP WHERE YOU LEFT OFF
              </Label>
              <Icon name="book-open" color="#A4B6A4" size={22} />
            </View>
            <Txt
              serif
              style={{ color: "#FBF9F5", fontSize: 34, lineHeight: 42 }}
            >
              {names[position.book]}{" "}
              <Txt serif style={{ color: "#D5BD7F", fontSize: 34 }}>
                · {position.chapter}
              </Txt>
            </Txt>
            <Txt
              style={{
                color: "#B5C5B6",
                fontSize: 11,
                marginTop: 4,
                marginBottom: 18,
              }}
            >
              {editionName.toUpperCase()} ·{" "}
              {books[position.book].testament.toUpperCase()} TESTAMENT
            </Txt>
            <Txt
              serif
              numberOfLines={3}
              style={{
                color: "#E7EBDE",
                fontSize: 21,
                lineHeight: 31,
                fontFamily: font.italic,
                marginBottom: 22,
              }}
            >
              {verseText(position)
                ? `“${verseText(position)}”`
                : "This passage is awaiting publication in the Allexi edition."}
            </Txt>
            <View
              style={{
                height: 3,
                backgroundColor: "#405648",
                borderRadius: 3,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  height: 3,
                  width: `${(position.chapter / books[position.book].chapters) * 100}%`,
                  backgroundColor: "#CDB67D",
                }}
              />
            </View>
            <View
              style={[
                styles.row,
                { justifyContent: "space-between", marginBottom: 18 },
              ]}
            >
              <Txt style={{ fontSize: 10, color: "#B5C5B6" }}>
                Chapter {position.chapter} of {books[position.book].chapters}
              </Txt>
              <Txt style={{ fontSize: 10, color: "#B5C5B6" }}>
                A moment in the Word
              </Txt>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => read(position)}
              style={({ pressed }) => ({
                backgroundColor: "#F0E8D3",
                padding: 14,
                borderRadius: 5,
                opacity: pressed ? 0.8 : 1,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              })}
            >
              <Txt
                style={{
                  color: "#1E3A2F",
                  fontFamily: font.bold,
                  fontSize: 12,
                }}
              >
                Continue reading
              </Txt>
              <Icon name="arrow-right" color="#1E3A2F" size={18} />
            </Pressable>
          </View>
          <View>
            <SectionTitle>Explore the Scriptures</SectionTitle>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(["Old", "New"] as const).map((testament, i) => (
                <Pressable
                  key={testament}
                  accessibilityRole="button"
                  onPress={() => select(testament)}
                  style={({ pressed }) => ({
                    flex: 1,
                    padding: 20,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: t.line,
                    backgroundColor: pressed ? t.soft : t.surface,
                    gap: 16,
                  })}
                >
                  <View
                    style={[styles.row, { justifyContent: "space-between" }]}
                  >
                    <Icon name={i ? "sun" : "feather"} size={23} />
                    <Txt muted style={{ fontSize: 10 }}>
                      {i ? 27 : 39} BOOKS
                    </Txt>
                  </View>
                  <View>
                    <Txt serif style={{ fontSize: 24, lineHeight: 30 }}>
                      {testament} Testament
                    </Txt>
                    <Txt muted style={{ fontSize: 10, marginTop: 4 }}>
                      {i ? "Matthew — Revelation" : "Genesis — Malachi"}
                    </Txt>
                  </View>
                  <Icon name="arrow-right" size={17} />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, gap: 24 }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <View style={{ height: 200, backgroundColor: "#8E9B7E" }}>
              <Landscape />
              <View style={{ position: "absolute", left: 22, top: 18 }}>
                <Label style={{ color: "#284A35" }}>
                  A MOMENT OF STILLNESS
                </Label>
              </View>
              <View style={{ position: "absolute", left: 22, bottom: 18 }}>
                <Txt
                  style={{ color: "#F5F1E5", fontSize: 10, letterSpacing: 2 }}
                >
                  DAILY CONTEMPLATION
                </Txt>
                <Txt
                  serif
                  style={{ color: "#FFF9E9", fontSize: 29, lineHeight: 36 }}
                >
                  A word for today
                </Txt>
              </View>
            </View>
            <View style={{ padding: 22, gap: 15 }}>
              <View
                style={{
                  borderLeftWidth: 2,
                  borderLeftColor: t.gold,
                  paddingLeft: 16,
                }}
              >
                <Txt
                  serif
                  style={{
                    fontFamily: font.italic,
                    fontSize: 23,
                    lineHeight: 33,
                  }}
                >
                  {day
                    ? `“${day.text}”`
                    : "Today’s reflection will appear as Allexi passages are published."}
                </Txt>
              </View>
              <Label style={{ color: t.gold }}>
                {day ? reference(day).toUpperCase() : editionName.toUpperCase()}{" "}
                · {readerEditionLabels[edition]}
              </Label>
              <View style={{ height: 1, backgroundColor: t.line }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  day
                    ? `Read ${reference(day)} in context`
                    : "Passage awaiting publication"
                }
                disabled={!day}
                onPress={() => {
                  if (day) read(day);
                }}
                style={[
                  styles.row,
                  { minHeight: 44, justifyContent: "space-between" },
                ]}
              >
                <Txt style={{ fontSize: 12, fontFamily: font.bold }}>
                  Read the passage
                </Txt>
                <Icon name="arrow-up-right" size={17} />
              </Pressable>
            </View>
          </Card>
          <View
            style={[
              styles.row,
              {
                padding: 16,
                paddingVertical: 10,
                backgroundColor: t.surface,
                borderRadius: 8,
              },
            ]}
          >
            <Icon name="feather" size={18} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontFamily: font.bold, fontSize: 11 }}>
                Read with intention.
              </Txt>
              <Txt muted style={{ fontSize: 10 }}>
                Space to study, reflect, and grow in the Word.
              </Txt>
            </View>
          </View>
        </View>
      </View>
      <View style={{ marginTop: 30 }}>
        <SectionTitle action="View all" onPress={showSaved}>
          From your study
        </SectionTitle>
        {recent.length ? (
          <View style={{ gap: 10 }}>
            {recent.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                onPress={() => read(r)}
              >
                <Card
                  style={{
                    padding: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <Icon
                    name={
                      r.kind === "note"
                        ? "edit-3"
                        : r.kind === "bookmark"
                          ? "bookmark"
                          : "edit-2"
                    }
                    size={19}
                  />
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontFamily: font.bold, fontSize: 12 }}>
                      {reference(r)}
                    </Txt>
                    <Txt muted numberOfLines={1} style={{ fontSize: 12 }}>
                      {r.text || verseText(r)}
                    </Txt>
                  </View>
                  <Icon name="chevron-right" size={16} />
                </Card>
              </Pressable>
            ))}
          </View>
        ) : (
          <Card
            style={{
              backgroundColor: t.surface,
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Icon name="edit-3" />
            <View style={{ flex: 1 }}>
              <Txt serif style={{ fontSize: 20 }}>
                Make room for reflection.
              </Txt>
              <Txt muted style={{ fontSize: 11 }}>
                Tap a verse as you read to highlight it, save it, or add a note.
              </Txt>
            </View>
          </Card>
        )}
      </View>
      <View style={{ alignItems: "center", marginTop: 32, gap: 7 }}>
        <Txt
          serif
          style={{ fontFamily: font.italic, color: t.muted, fontSize: 16 }}
        >
          “Thy word is a lamp unto my feet.”
        </Txt>
        <Label style={{ fontSize: 8 }}>PSALM 119:105</Label>
      </View>
    </View>
  );
}
