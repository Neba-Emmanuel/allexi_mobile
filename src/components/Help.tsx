import React, { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import help from "../data/help.json";
import { Button, Icon, Label, Txt, font, styles, useTheme } from "./ui";

export type HelpPage = "support" | "privacy";

export default function Help({ page, onBack, onNavigate }: {
  page: HelpPage;
  onBack: () => void;
  onNavigate: (page: HelpPage) => void;
}) {
  const t = useTheme();
  const [message, setMessage] = useState("");
  const content = help[page];
  async function contact(deletion = false) {
    const subject = deletion ? "Account deletion" : page === "privacy" ? "Allexi Bible privacy question" : "Allexi Bible support";
    try {
      await Linking.openURL(`mailto:${help.email}?subject=${encodeURIComponent(subject)}`);
      setMessage("");
    } catch {
      setMessage(`Your email app could not be opened. Please email ${help.email}.`);
    }
  }
  return (
    <View testID={`${page}-content`} style={{ gap: 24 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to settings" onPress={onBack} style={[styles.row, { minHeight: 44 }]}>
        <Icon name="arrow-left" size={16} />
        <Txt muted>Back to settings</Txt>
      </Pressable>
      <View style={{ gap: 16 }}>
        <View style={{ backgroundColor: t.soft, padding: 16, borderRadius: 16, alignSelf: "flex-start" }}>
          <Icon name={page === "support" ? "help-circle" : "shield"} size={28} />
        </View>
        <Label style={{ color: t.gold }}>{page === "support" ? "HERE TO HELP" : "PRIVACY POLICY"}</Label>
        <Txt serif accessibilityRole="header" style={{ fontSize: 34, lineHeight: 41 }}>{content.title}</Txt>
        <Txt style={{ fontSize: 16, lineHeight: 26 }}>{content.intro}</Txt>
        {page === "privacy" ? <Txt muted>Last updated {help.privacy.updated}</Txt> : null}
      </View>
      {content.sections.map((section) => (
        <View key={section.title} style={{ gap: 10, paddingTop: 20, borderTopWidth: 1, borderColor: t.line }}>
          <Txt accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 18, lineHeight: 26 }}>{section.title}</Txt>
          <Txt style={{ fontSize: 16, lineHeight: 27 }}>{section.body}</Txt>
        </View>
      ))}
      <View style={{ gap: 14, padding: 20, backgroundColor: t.surface, borderRadius: 12 }}>
        <Txt serif accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32 }}>Let’s talk.</Txt>
        <Txt selectable style={{ fontSize: 16 }}>{help.email}</Txt>
        <Button icon="mail" onPress={() => void contact()}>Email support</Button>
        <Button secondary onPress={() => void contact(true)}>Request account deletion by email</Button>
        {message ? <Txt accessibilityRole="alert">{message}</Txt> : null}
      </View>
      <Button secondary onPress={() => onNavigate(page === "support" ? "privacy" : "support")}>
        {page === "support" ? "Read our privacy policy" : "Visit Support"}
      </Button>
    </View>
  );
}
