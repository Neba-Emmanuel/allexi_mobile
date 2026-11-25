import React, { createContext, useContext } from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  type TextStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../lib/store";

const light = {
  bg: "#FBF9F5",
  surface: "#F2F0E9",
  card: "#FFFFFF",
  text: "#252E27",
  muted: "#72796F",
  green: "#1E3A2F",
  line: "#E5E3D9",
  gold: "#A4823D",
  soft: "#E7ECDF",
};
const dark = {
  bg: "#141B17",
  surface: "#202C24",
  card: "#1B251F",
  text: "#EAE9DF",
  muted: "#A0AFA3",
  green: "#AFCCB7",
  line: "#344139",
  gold: "#CEB16C",
  soft: "#2B3B30",
};
export const font = {
  serif: "Newsreader_400Regular",
  italic: "Newsreader_400Regular_Italic",
  sans: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  bold: "PlusJakartaSans_600SemiBold",
};
export const useTheme = () => (useStore().preferences.dark ? dark : light);
const TextColor = createContext<string | undefined>(undefined);
export function Txt({
  children,
  style,
  serif = false,
  muted = false,
  ...props
}: React.ComponentProps<typeof Text> & { serif?: boolean; muted?: boolean }) {
  const t = useTheme(),
    color = useContext(TextColor);
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: serif ? font.serif : font.sans,
          fontSize: 14,
          lineHeight: 22,
          color: color ?? (muted ? t.muted : t.text),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Icon({
  name,
  size = 20,
  color,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  size?: number;
  color?: string;
}) {
  const t = useTheme();
  return <Feather name={name} size={size} color={color ?? t.green} />;
}
export function IconButton({
  name,
  label,
  onPress,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Button({
  children,
  onPress,
  secondary = false,
  disabled = false,
  icon,
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
}) {
  const t = useTheme();
  const color = secondary ? t.green : "#FBF9F5";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={typeof children === "string" ? children : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 6,
        backgroundColor: secondary ? t.surface : "#1E3A2F",
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      })}
    >
      <TextColor.Provider value={color}>
        <Txt style={{ fontFamily: font.bold, fontSize: 12 }}>{children}</Txt>
      </TextColor.Provider>
      {icon ? <Icon name={icon} size={16} color={color} /> : null}
    </Pressable>
  );
}
export function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Txt
      style={[
        {
          fontFamily: font.bold,
          fontSize: 10,
          letterSpacing: 2,
          color: t.muted,
          lineHeight: 18,
        },
        style,
      ]}
    >
      {children}
    </Txt>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.line,
          borderRadius: 10,
          padding: 22,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 6, marginBottom: 26 }}>
      <Txt serif style={{ fontSize: 36, lineHeight: 44 }}>
        {title}
      </Txt>
      {subtitle ? (
        <Txt muted style={{ fontSize: 12 }}>
          {subtitle}
        </Txt>
      ) : null}
    </View>
  );
}
export function SectionTitle({
  children,
  action,
  onPress,
}: {
  children: React.ReactNode;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View
      style={[
        styles.row,
        { justifyContent: "space-between", marginBottom: 16 },
      ]}
    >
      <Txt serif style={{ fontSize: 24, lineHeight: 30 }}>
        {children}
      </Txt>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Txt style={{ fontSize: 11 }}>{action} ↗</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useTheme(),
    insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          alignItems: "center",
          backgroundColor: "#07170FA0",
          paddingTop: insets.top + 24,
        }}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: t.bg,
            width: "100%",
            maxWidth: 650,
            maxHeight: "92%",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: Math.max(insets.bottom, 20),
          }}
        >
          <View
            style={{
              alignSelf: "center",
              height: 4,
              width: 36,
              borderRadius: 2,
              backgroundColor: t.line,
              marginTop: 12,
            }}
          />
          <View
            style={[
              styles.row,
              {
                paddingHorizontal: 24,
                paddingTop: 12,
                justifyContent: "space-between",
              },
            ]}
          >
            <Txt serif style={{ fontSize: 27, lineHeight: 36 }}>
              {title}
            </Txt>
            <IconButton name="x" label="Close" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, paddingTop: 12, gap: 20 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  page: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    width: "100%",
    maxWidth: 1160,
    alignSelf: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: font.sans,
    fontSize: 14,
    minHeight: 48,
  },
  divider: { height: 1, marginVertical: 22 },
});
