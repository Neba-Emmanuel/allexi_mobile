import React from "react";
import { Image, View } from "react-native";
import { useContent } from "../lib/content";
import { about } from "../data/about";
import { Label, Txt, font, styles, useTheme } from "./ui";

export default function About() {
  const t = useTheme();
  const { editionName, edition } = useContent();
  return (
    <View testID="about-content" style={{ gap: 20 }}>
      <View style={{ gap: 18, paddingBottom: 12 }}>
        <Image
          source={require("../../assets/icon.png")}
          accessibilityLabel="Allexi Bible app icon"
          style={{ width: 78, height: 78, borderRadius: 18 }}
        />
        <Label style={{ color: t.gold }}>OUR PURPOSE & PERSPECTIVE</Label>
        <Txt
          serif
          accessibilityRole="header"
          style={{ fontSize: 34, lineHeight: 41 }}
        >
          {about.title}
        </Txt>
        <Txt
          serif
          style={{
            fontFamily: font.italic,
            fontSize: 22,
            lineHeight: 30,
            color: t.muted,
          }}
        >
          {about.subtitle}
        </Txt>
      </View>
      <View style={{ height: 1, backgroundColor: t.line }} />
      {about.paragraphs.map((paragraph) => (
        <Txt key={paragraph} serif style={{ fontSize: 21, lineHeight: 34 }}>
          {paragraph}
        </Txt>
      ))}
      <View
        style={{
          borderLeftWidth: 2,
          borderColor: t.gold,
          paddingLeft: 20,
          paddingVertical: 8,
        }}
      >
        <Txt
          testID="about-statement"
          serif
          style={{
            fontFamily: font.italic,
            fontSize: 26,
            lineHeight: 36,
            color: t.green,
          }}
        >
          {about.emphasis}
        </Txt>
      </View>
      <Txt serif style={{ fontSize: 21, lineHeight: 34 }}>
        {about.closing}
      </Txt>
      <View style={{ height: 1, backgroundColor: t.line, marginTop: 6 }} />
      <View style={{ gap: 8 }}>
        <Label>READING EDITION</Label>
        <Txt muted style={{ fontSize: 12 }}>
          {editionName}
          {edition === "kjv" ? " · Modern spelling" : ""}
        </Txt>
        <Txt muted style={{ fontSize: 11 }}>
          {edition === "kjv"
            ? "Scripture source: thiagobodruk/bible."
            : "Published Allexi editorial text."}
        </Txt>
        <View
          style={[
            styles.row,
            { justifyContent: "space-between", marginTop: 10 },
          ]}
        >
          <Txt muted style={{ fontSize: 10 }}>
            Allexi Bible · Edition 0.1
          </Txt>
          <Txt
            serif
            style={{ fontFamily: font.italic, fontSize: 16, color: t.gold }}
          >
            The Word, with you.
          </Txt>
        </View>
      </View>
    </View>
  );
}
