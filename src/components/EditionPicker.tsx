import React from "react";
import { Pressable, View } from "react-native";
import type { Edition } from "../../shared/src/content";
import { useContent, readerEditionNames } from "../lib/content";
import { Icon, Label, Sheet, Txt, styles, useTheme } from "./ui";

export default function EditionPicker({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const t = useTheme(),
    { snapshot, selection, chooseEdition } = useContent();
  const choices: { id: Edition | null; name: string; description: string }[] = [
    {
      id: null,
      name: "Follow app default",
      description: `Currently ${readerEditionNames[snapshot.defaultEdition]}`,
    },
    {
      id: "kjv",
      name: readerEditionNames.kjv,
      description: "Read the standard scripture text",
    },
    {
      id: "allexi",
      name: readerEditionNames.allexi,
      description: "Read the published Allexi text",
    },
  ];
  return (
    <Sheet visible={visible} title="Reading edition" onClose={onClose}>
      <Label>CHOOSE YOUR EDITION</Label>
      {choices.map((choice) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={choice.name}
          accessibilityState={{ selected: selection === choice.id }}
          key={choice.id ?? "default"}
          onPress={() => {
            chooseEdition(choice.id);
            onClose();
          }}
          style={[
            styles.row,
            {
              padding: 18,
              minHeight: 76,
              borderWidth: 1,
              borderColor: selection === choice.id ? t.green : t.line,
              borderRadius: 7,
              backgroundColor: selection === choice.id ? t.soft : t.surface,
            },
          ]}
        >
          <Icon name="book-open" />
          <View style={{ flex: 1 }}>
            <Txt serif style={{ fontSize: 22, lineHeight: 28 }}>
              {choice.name}
            </Txt>
            <Txt muted style={{ fontSize: 11 }}>
              {choice.description}
            </Txt>
          </View>
          {selection === choice.id ? <Icon name="check" size={18} /> : null}
        </Pressable>
      ))}
      <Txt muted style={{ fontSize: 12 }}>
        Allexi passages appear as they are published. Unpublished passages are
        identified clearly.
      </Txt>
    </Sheet>
  );
}
