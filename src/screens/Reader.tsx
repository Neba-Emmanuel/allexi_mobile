import React, { useEffect, useRef } from "react";
import { View, Pressable, ScrollView } from "react-native";
import type { Passage, Verse } from "../../shared/src/index";
import { colors } from "../../shared/src/index";
import { useStore } from "../lib/store";
import { adjacent, chapterVerses, names } from "../data/bible";
import { useContent, readerEditionLabels } from "../lib/content";
import {
  Txt,
  Label,
  Icon,
  IconButton,
  font,
  styles,
  useTheme,
} from "../components/ui";

export default function Reader({
  passage,
  onNavigate,
  onSelect,
  onAppearance,
  onEdition,
  onVerse,
}: {
  passage: Passage;
  onNavigate: (p: Passage) => void;
  onSelect: () => void;
  onAppearance: () => void;
  onEdition: () => void;
  onVerse: (v: Verse) => void;
}) {
  const t = useTheme(),
    { preferences, records } = useStore(),
    scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [passage.book, passage.chapter]);
  const { bible, edition, editionName, chooseEdition } = useContent();
  const verses = bible.chapter(passage.book, passage.chapter);
  const total = chapterVerses(passage.book, passage.chapter).length;
  return (
    <View
      style={{ flex: 1, width: "100%", maxWidth: 850, alignSelf: "center" }}
    >
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose book and chapter"
          onPress={onSelect}
          style={[styles.row, { minHeight: 48 }]}
        >
          <Txt serif style={{ fontSize: 23 }}>
            {names[passage.book]} {passage.chapter}
          </Txt>
          <Icon name="chevron-down" size={16} />
        </Pressable>
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose reading edition"
            onPress={onEdition}
            style={[styles.row, { minHeight: 44, gap: 5 }]}
          >
            <Label style={{ color: t.gold }}>{readerEditionLabels[edition]}</Label>
            <Icon name="chevron-down" size={12} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reading appearance"
            onPress={onAppearance}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt serif style={{ fontSize: 23 }}>
              Aa
            </Txt>
          </Pressable>
        </View>
      </View>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{
          paddingHorizontal: 28,
          paddingTop: 34,
          paddingBottom: 40,
        }}
      >
        <Label style={{ textAlign: "center", color: t.gold, marginBottom: 12 }}>
          THE{" "}
          {passage.book === 42
            ? "GOSPEL ACCORDING TO JOHN"
            : names[passage.book].toUpperCase()}
        </Label>
        <Txt
          serif
          style={{
            fontSize: 44,
            lineHeight: 55,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Chapter {passage.chapter}
        </Txt>
        <Txt
          muted
          style={{ fontSize: 10, textAlign: "center", marginBottom: 30 }}
        >
          {editionName.toUpperCase()} · TAP A VERSE TO STUDY
        </Txt>
        {edition === "allexi" && verses.length < total ? (
          <View
            style={{
              padding: 18,
              backgroundColor: t.surface,
              borderRadius: 7,
              marginBottom: 24,
              gap: 10,
            }}
          >
            <Txt serif style={{ fontSize: 23, lineHeight: 30 }}>
              {verses.length
                ? `${verses.length} of ${total} verses published`
                : "This chapter is being prepared."}
            </Txt>
            <Txt muted style={{ fontSize: 12, lineHeight: 21 }}>
              Allexi wording appears here once the editors publish it. You can
              read the standard edition while this edition is being prepared.
            </Txt>
            <Pressable
              accessibilityRole="button"
              onPress={() => chooseEdition("kjv")}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Txt style={{ fontSize: 12, color: t.green }}>
                Read the standard edition →
              </Txt>
            </Pressable>
          </View>
        ) : null}
        {verses.map((v) => {
          const highlight = records.find(
            (r) =>
              r.book === v.book &&
              r.chapter === v.chapter &&
              r.verse === v.verse &&
              r.kind === "highlight" &&
              !r.deleted,
          );
          const saved = records.some(
            (r) =>
              r.book === v.book &&
              r.chapter === v.chapter &&
              r.verse === v.verse &&
              r.kind !== "progress" &&
              !r.deleted,
          );
          const focused = passage.verse === v.verse && passage.verse > 1;
          return (
            <Pressable
              key={v.verse}
              accessibilityRole="button"
              accessibilityLabel={`Verse ${v.verse}: ${v.text}`}
              onPress={() => onVerse(v)}
              onLayout={(event) => {
                if (focused)
                  scroll.current?.scrollTo({
                    y: Math.max(0, event.nativeEvent.layout.y - 24),
                    animated: false,
                  });
              }}
              style={({ pressed }) => ({
                paddingVertical: 8,
                paddingHorizontal: 8,
                marginHorizontal: -8,
                marginBottom: 4,
                borderRadius: 4,
                backgroundColor: highlight
                  ? colors[highlight.color ?? "gold"]
                  : pressed || focused
                    ? t.soft
                    : "transparent",
                borderLeftWidth: 2,
                borderLeftColor: saved ? t.gold : "transparent",
              })}
            >
              <Txt
                style={{
                  fontFamily: preferences.sans ? font.sans : font.serif,
                  fontSize: preferences.fontSize,
                  lineHeight: preferences.fontSize * preferences.lineHeight,
                  color: highlight ? "#253A2A" : t.text,
                }}
              >
                <Txt
                  style={{
                    fontSize: 10,
                    fontFamily: font.medium,
                    color: highlight ? "#50603A" : t.gold,
                  }}
                >
                  {v.verse}{" "}
                </Txt>
                {v.text}
              </Txt>
            </Pressable>
          );
        })}
        <View
          style={[
            styles.row,
            {
              justifyContent: "space-between",
              borderTopWidth: 1,
              borderColor: t.line,
              paddingTop: 20,
              marginTop: 30,
            },
          ]}
        >
          <IconButton
            name="arrow-left"
            label="Previous chapter"
            onPress={() => onNavigate(adjacent(passage, -1))}
          />
          <Label>
            {names[passage.book].toUpperCase()} {passage.chapter}
          </Label>
          <IconButton
            name="arrow-right"
            label="Next chapter"
            onPress={() => onNavigate(adjacent(passage, 1))}
          />
        </View>
      </ScrollView>
    </View>
  );
}
