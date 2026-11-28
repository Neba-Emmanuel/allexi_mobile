import ErrorBoundary from "./components/ErrorBoundary";
import React, { useCallback, useState } from "react";
import {
  Text,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader/400Regular";
import { Newsreader_400Regular_Italic } from "@expo-google-fonts/newsreader/400Regular_Italic";
import { PlusJakartaSans_400Regular } from "@expo-google-fonts/plus-jakarta-sans/400Regular";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans/600SemiBold";
import type { Passage, Verse } from "../shared/src/index";
import { StoreProvider, useStore } from "./lib/store";
import {
  Button,
  Icon,
  IconButton,
  Label,
  Txt,
  font,
  styles,
  useTheme,
} from "./components/ui";
import Home from "./screens/Home";
import Reader from "./screens/Reader";
import Search from "./screens/Search";
import Saved from "./screens/Saved";
import {
  Appearance,
  BookSelector,
  VerseActions,
} from "./components/StudySheets";
import Settings from "./components/Settings";
import Landscape from "./components/Landscape";
import Admin from "./screens/Admin";
import EditionPicker from "./components/EditionPicker";
import { ContentProvider, useContent } from "./lib/content";
import AnimatedSplash from "./components/AnimatedSplash";

type Tab = "Home" | "Bible" | "Search" | "Saved";
const tabs: {
  name: Tab;
  icon: React.ComponentProps<typeof Icon>["name"];
  caption: string;
}[] = [
  { name: "Home", icon: "home", caption: "Your quiet corner" },
  { name: "Bible", icon: "book-open", caption: "Read & reflect" },
  { name: "Search", icon: "search", caption: "Seek in Scripture" },
  { name: "Saved", icon: "bookmark", caption: "Kept close" },
];
function Brand() {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <View
        style={{
          width: 42,
          height: 46,
          backgroundColor: "#1E3A2F",
          borderRadius: 6,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="book-open" color="#D7C18B" size={23} />
      </View>
      <View>
        <Txt serif style={{ fontSize: 25, lineHeight: 29, color: t.green }}>
          Allexi Bible
        </Txt>
        <Label style={{ fontSize: 7, letterSpacing: 2.1 }}>
          THE WORD, WITH YOU.
        </Label>
      </View>
    </View>
  );
}
function Main({ showStatusBar }: { showStatusBar: boolean }) {
  const s = useStore(),
    content = useContent(),
    t = useTheme(),
    wide = useWindowDimensions().width >= 850;
  const [tab, setTab] = useState<Tab>("Home"),
    [passage, setPassage] = useState<Passage | null>(null);
  const [selector, setSelector] = useState(false),
    [testament, setTestament] = useState<"Old" | "New">("New"),
    [appearance, setAppearance] = useState(false),
    [settings, setSettings] = useState(false),
    [verse, setVerse] = useState<Verse | null>(null),
    [adminOpen, setAdminOpen] = useState(false),
    [editionPicker, setEditionPicker] = useState(false);
  function read(p: Passage) {
    setPassage(p);
    s.go(p);
    setTab("Bible");
  }
  function choose(test: "Old" | "New") {
    setTestament(test);
    setSelector(true);
  }
  if (Platform.OS === "web" && adminOpen)
    return (
      <Admin
        onClose={() => {
          setAdminOpen(false);
          setSettings(true);
        }}
      />
    );
  if (!s.preferences.welcomed)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        {showStatusBar ? (
          <StatusBar style={s.preferences.dark ? "light" : "dark"} />
        ) : null}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            maxWidth: 520,
            width: "100%",
            alignSelf: "center",
            padding: 28,
            justifyContent: "center",
            gap: 24,
          }}
        >
          <Brand />
          <View
            style={{
              height: 230,
              borderRadius: 10,
              overflow: "hidden",
              marginTop: 24,
            }}
          >
            <Landscape />
          </View>
          <Label style={{ color: t.gold }}>
            EXTENDED EXPLICIT ALLEXI BIBLE
          </Label>
          <Txt serif style={{ fontSize: 46, lineHeight: 53 }}>
            {"Be still.\nThe Word is here."}
          </Txt>
          <Txt muted style={{ lineHeight: 25 }}>
            A thoughtful space to read, study, and reflect on the Word of the
            Lord.
          </Txt>
          <Button
            icon="arrow-right"
            onPress={() => s.setPreferences({ welcomed: true })}
          >
            Enter the Scriptures
          </Button>
          <View style={[styles.row, { justifyContent: "center" }]}>
            <Icon name="feather" size={14} />
            <Txt muted style={{ fontSize: 10 }}>
              Read. Reflect. Grow.
            </Txt>
          </View>
          <Txt muted style={{ fontSize: 10, textAlign: "center" }}>
            {content.editionName}
          </Txt>
        </ScrollView>
      </SafeAreaView>
    );
  const nav = (mobile: boolean) => (
    <View
      style={
        mobile
          ? {
              flexDirection: "row",
              borderTopWidth: 1,
              borderColor: t.line,
              backgroundColor: t.bg,
              paddingTop: 7,
              paddingBottom: 3,
            }
          : { gap: 7, marginTop: 48 }
      }
    >
      {tabs.map((item) => (
        <Pressable
          key={item.name}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === item.name }}
          accessibilityLabel={item.name}
          onPress={() => setTab(item.name)}
          style={({ pressed }) =>
            mobile
              ? {
                  flex: 1,
                  minHeight: 56,
                  gap: 5,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                }
              : {
                  flexDirection: "row",
                  gap: 14,
                  minHeight: 68,
                  paddingHorizontal: 18,
                  borderRadius: 7,
                  alignItems: "center",
                  backgroundColor:
                    tab === item.name
                      ? t.soft
                      : pressed
                        ? t.surface
                        : "transparent",
                }
          }
        >
          <Icon
            name={item.icon}
            color={tab === item.name ? t.green : t.muted}
            size={mobile ? 20 : 19}
          />
          <View>
            <Txt
              style={{
                fontSize: mobile ? 9 : 12,
                fontFamily: tab === item.name ? font.bold : font.sans,
                color: tab === item.name ? t.green : t.muted,
              }}
            >
              {item.name === "Bible" && !mobile ? "The Scriptures" : item.name}
            </Txt>
            {!mobile ? (
              <Txt muted style={{ fontSize: 9, marginTop: 1 }}>
                {item.caption}
              </Txt>
            ) : null}
          </View>
          {!mobile && tab === item.name ? (
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: t.gold,
                marginLeft: "auto",
              }}
            />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      {showStatusBar ? (
        <StatusBar style={s.preferences.dark ? "light" : "dark"} />
      ) : null}
      <View style={{ flex: 1, flexDirection: "row" }}>
        {wide ? (
          <View
            style={{
              width: 245,
              padding: 22,
              borderRightWidth: 1,
              borderColor: t.line,
              backgroundColor: t.surface,
            }}
          >
            <Brand />
            {nav(false)}
            <View style={{ marginTop: "auto", gap: 18 }}>
              <View style={{ height: 1, backgroundColor: t.line }}>
                <View />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSettings(true)}
                style={[styles.row, { minHeight: 48, paddingHorizontal: 12 }]}
              >
                <Icon name="settings" size={17} />
                <Txt muted style={{ fontSize: 11 }}>
                  Settings & About
                </Txt>
              </Pressable>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: t.line,
                  padding: 14,
                  borderRadius: 7,
                  gap: 8,
                }}
              >
                <View style={styles.row}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: t.green,
                    }}
                  />
                  <Label style={{ fontSize: 8, letterSpacing: 1.1 }}>
                    A MOMENT IN THE WORD
                  </Label>
                </View>
                <Txt muted style={{ fontSize: 10, lineHeight: 18 }}>
                  “Thy word is a lamp unto my feet.”
                </Txt>
              </View>
              <Txt
                muted
                style={{ fontSize: 8, textAlign: "center", letterSpacing: 1 }}
              >
                ALLEXI · EDITION 0.1
              </Txt>
            </View>
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={[
              styles.row,
              {
                paddingHorizontal: wide ? 32 : 20,
                minHeight: 76,
                borderBottomWidth: 1,
                borderColor: t.line,
                justifyContent: "space-between",
              },
            ]}
          >
            {wide ? (
              <View style={styles.row}>
                <Txt muted style={{ fontSize: 11 }}>
                  Your library
                </Txt>
                <Txt muted style={{ fontSize: 11 }}>
                  {" "}
                  /{" "}
                </Txt>
                <Txt style={{ fontSize: 11 }}>
                  {tab === "Bible" ? "The Scriptures" : tab}
                </Txt>
              </View>
            ) : (
              <Brand />
            )}
            <View style={[styles.row, { gap: 10 }]}>
              {wide ? (
                <View style={[styles.row, { gap: 7, marginRight: 14 }]}>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: t.green,
                    }}
                  />
                  <Txt muted style={{ fontSize: 10 }}>
                    {content.editionName}
                  </Txt>
                </View>
              ) : null}
              <IconButton
                name={s.preferences.dark ? "sun" : "moon"}
                label="Toggle reading theme"
                onPress={() => s.setPreferences({ dark: !s.preferences.dark })}
              />
              {wide ? (
                <IconButton
                  name="settings"
                  label="Settings"
                  onPress={() => setSettings(true)}
                />
              ) : (
                <IconButton
                  name="settings"
                  label="Settings"
                  onPress={() => setSettings(true)}
                />
              )}
            </View>
          </View>
          {s.error ? (
            <View
              accessibilityRole="alert"
              style={{ padding: 12, backgroundColor: t.surface }}
            >
              <Txt style={{ color: t.gold, fontSize: 12 }}>{s.error}</Txt>
            </View>
          ) : null}
          {tab === "Home" ? (
            <ScrollView>
              <Home
                read={read}
                select={choose}
                showSaved={() => setTab("Saved")}
              />
            </ScrollView>
          ) : tab === "Bible" ? (
            <Reader
              passage={passage ?? s.position}
              onNavigate={read}
              onSelect={() =>
                choose((passage ?? s.position).book < 39 ? "Old" : "New")
              }
              onAppearance={() => setAppearance(true)}
              onEdition={() => setEditionPicker(true)}
              onVerse={(v) => {
                s.go(v);
                setVerse(v);
              }}
            />
          ) : tab === "Search" ? (
            <Search read={read} />
          ) : (
            <Saved read={read} edit={setVerse} />
          )}
          {!wide ? nav(true) : null}
        </View>
      </View>
      <BookSelector
        visible={selector}
        initialTestament={testament}
        onClose={() => setSelector(false)}
        onSelect={read}
      />
      <Appearance visible={appearance} onClose={() => setAppearance(false)} />
      <VerseActions verse={verse} onClose={() => setVerse(null)} />
      <Settings
        visible={settings}
        onClose={() => setSettings(false)}
        onAdmin={() => {
          setSettings(false);
          if (Platform.OS === "web") setAdminOpen(true);
        }}
      />
      <EditionPicker
        visible={editionPicker}
        onClose={() => setEditionPicker(false)}
      />
    </SafeAreaView>
  );
}
function Startup() {
  const s = useStore();
  const content = useContent();
  const [finished, setFinished] = useState(false);
  const onFinish = useCallback(() => setFinished(true), []);
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
  });
  const error = s.error || fontError?.message;
  const ready = Boolean((s.ready && fontsLoaded && content.ready) || error);
  return (
    <View style={{ flex: 1, backgroundColor: "#132F25" }}>
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={!finished}
        importantForAccessibility={finished ? "auto" : "no-hide-descendants"}
      >
        {s.ready && fontsLoaded && content.ready ? (
          <Main showStatusBar={finished} />
        ) : error ? (
          <SafeAreaView
            style={{
              flex: 1,
              backgroundColor: "#FBF9F5",
              justifyContent: "center",
              padding: 32,
              gap: 16,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{ fontSize: 26, color: "#1E3A2F" }}
            >
              Your library needs a moment.
            </Text>
            <Text
              accessibilityRole="alert"
              style={{ fontSize: 15, lineHeight: 24, color: "#72796F" }}
            >
              {error}
            </Text>
          </SafeAreaView>
        ) : null}
      </View>
      {!finished ? (
        <AnimatedSplash
          ready={ready}
          fontsReady={fontsLoaded}
          onFinish={onFinish}
        />
      ) : null}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StoreProvider>
          <ContentProvider>
            <Startup />
          </ContentProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
