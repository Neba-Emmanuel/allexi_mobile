import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import Svg, { Path } from "react-native-svg";

const palette = {
  forest: "#132F25",
  gold: "#D6BC7D",
  ivory: "#FAF5E8",
};
const native = Platform.OS !== "web";

function BookPage({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <Svg
      width={53}
      height={72}
      viewBox="0 0 53 72"
      style={mirrored ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path
        d="M50 15C37 5 23 3 4 7V58C22 54 37 57 50 66Z"
        fill="#1D3D2E"
        stroke={palette.gold}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <Path
        d="M13 18C25 17 34 20 41 24M13 28C25 27 34 30 41 34M13 38C25 37 34 40 41 44"
        fill="none"
        stroke={palette.gold}
        strokeWidth={1.1}
        strokeLinecap="round"
        opacity={0.55}
      />
      <Path
        d="M4 64C22 60 37 63 50 71"
        fill="none"
        stroke={palette.gold}
        strokeWidth={1.3}
        strokeLinecap="round"
        opacity={0.5}
      />
    </Svg>
  );
}

export default function AnimatedSplash({
  ready,
  fontsReady,
  onFinish,
}: {
  ready: boolean;
  fontsReady: boolean;
  onFinish: () => void;
}) {
  const compact = useWindowDimensions().height < 650;
  const [laidOut, setLaidOut] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [introFinished, setIntroFinished] = useState(false);
  const page = useRef(new Animated.Value(0)).current;
  const emblem = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const detail = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setReduceMotion(value);
      })
      .catch(() => {
        if (live) setReduceMotion(false);
      });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!laidOut || reduceMotion === null) return;
    // The first React frame is painted before the native launch screen disappears.
    void SplashScreen.hideAsync().catch(() => {});
    if (reduceMotion) {
      for (const value of [page, emblem, title, detail]) value.setValue(1);
      setIntroFinished(true);
      return;
    }
    const timing = (value: Animated.Value, duration: number) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: native,
        isInteraction: false,
      });
    const intro = Animated.parallel([
      timing(emblem, 1150),
      Animated.sequence([Animated.delay(100), timing(page, 1050)]),
      Animated.sequence([Animated.delay(400), timing(title, 850)]),
      Animated.sequence([Animated.delay(850), timing(detail, 800)]),
      Animated.delay(2100),
    ]);
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: native,
          isInteraction: false,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: native,
          isInteraction: false,
        }),
      ]),
    );
    intro.start(({ finished }) => {
      if (finished) setIntroFinished(true);
    });
    glow.start();
    return () => {
      intro.stop();
      glow.stop();
    };
  }, [laidOut, reduceMotion, page, emblem, title, detail, breath]);

  useEffect(() => {
    if (!ready || !introFinished) return;
    const transition = Animated.timing(exit, {
      toValue: 1,
      duration: reduceMotion ? 0 : 500,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: native,
    });
    transition.start(({ finished }) => {
      if (finished) onFinish();
    });
    return () => transition.stop();
  }, [ready, introFinished, reduceMotion, exit, onFinish]);

  const customSerif = fontsReady
    ? "Newsreader_400Regular"
    : Platform.OS === "ios"
      ? "Georgia"
      : "serif";
  const sans = fontsReady ? "PlusJakartaSans_400Regular" : undefined;

  return (
    <Animated.View
      testID="animated-splash"
      accessibilityViewIsModal
      accessibilityLabel="Allexi Bible. Opening the Scriptures."
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      onLayout={() => setLaidOut(true)}
      style={[
        styles.root,
        {
          opacity: exit.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
        },
      ]}
    >
      <StatusBar style="light" backgroundColor={palette.forest} />
      <View pointerEvents="none" style={styles.insetFrame} />
      <View pointerEvents="none" style={styles.topRule}>
        <View style={styles.rule} />
        <View style={styles.diamond} />
        <View style={styles.rule} />
      </View>

      <Animated.View
        testID="splash-emblem"
        pointerEvents="none"
        style={[
          styles.emblem,
          {
            transform: [
              {
                translateY: emblem.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -78],
                }),
              },
              {
                scale: exit.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.05],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.halo,
            {
              opacity: breath.interpolate({
                inputRange: [0, 1],
                outputRange: [0.035, 0.09],
              }),
              transform: [
                {
                  scale: breath.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1.1],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.outerRing,
            {
              opacity: emblem,
              transform: [
                {
                  scale: emblem.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.88, 1],
                  }),
                },
              ],
            },
          ]}
        />
        <View style={styles.arch} />
        <View style={styles.archInner} />
        <Animated.View
          style={[
            styles.rays,
            {
              opacity: page,
              transform: [
                {
                  translateY: page.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width={82} height={43} viewBox="0 0 82 43">
            <Path
              d="M41 2V18M12 12L22 25M70 12L60 25M2 35L16 38M80 35L66 38"
              stroke={palette.gold}
              strokeWidth={1.1}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
        <Animated.View
          testID="splash-left-page"
          style={[
            styles.leftPage,
            {
              transform: [
                { perspective: 600 },
                { translateX: 25 },
                {
                  rotateY: page.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["-76deg", "0deg"],
                  }),
                },
                { translateX: -25 },
              ],
            },
          ]}
        >
          <BookPage />
        </Animated.View>
        <Animated.View
          style={[
            styles.rightPage,
            {
              transform: [
                { perspective: 600 },
                { translateX: -25 },
                {
                  rotateY: page.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["76deg", "0deg"],
                  }),
                },
                { translateX: 25 },
              ],
            },
          ]}
        >
          <BookPage mirrored />
        </Animated.View>
        <View style={styles.spine} />
        <Animated.View
          style={[
            styles.underBook,
            { opacity: detail, transform: [{ scaleX: detail }] },
          ]}
        />
      </Animated.View>

      <Animated.View
        testID="splash-wordmark"
        style={[
          styles.wordmark,
          compact ? { marginTop: 35 } : undefined,
          {
            opacity: title,
            transform: [
              {
                translateY: title.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text
          style={[
            styles.name,
            { fontFamily: customSerif },
            compact ? { fontSize: 52, lineHeight: 62 } : undefined,
          ]}
        >
          Allexi
        </Text>
        <Text style={[styles.bible, { fontFamily: sans }]}>B I B L E</Text>
        <Animated.View
          style={[styles.divider, { transform: [{ scaleX: detail }] }]}
        />
        <Animated.Text
          style={[
            styles.tagline,
            {
              fontFamily: fontsReady
                ? "Newsreader_400Regular_Italic"
                : customSerif,
              opacity: detail,
            },
          ]}
        >
          The Word, with you.
        </Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: detail }]}>
        <Text style={[styles.footerTitle, { fontFamily: sans }]}>
          A QUIET PLACE FOR THE WORD
        </Text>
        <View style={styles.footerStatus}>
          <View style={styles.dot} />
          <Text style={[styles.footerDetail, { fontFamily: sans }]}>
            {introFinished && !ready
              ? "Opening the Scriptures"
              : "Read. Reflect. Grow."}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: palette.forest,
    overflow: "hidden",
  },
  insetFrame: {
    ...StyleSheet.absoluteFillObject,
    margin: 18,
    borderWidth: 1,
    borderColor: "#D6BC7D12",
    borderRadius: 3,
  },
  topRule: {
    position: "absolute",
    top: "13%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  rule: { width: 30, height: 1, backgroundColor: "#D6BC7D45" },
  diamond: {
    width: 4,
    height: 4,
    transform: [{ rotate: "45deg" }],
    backgroundColor: palette.gold,
  },
  emblem: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 240,
    height: 240,
    marginLeft: -120,
    marginTop: -120,
  },
  halo: {
    position: "absolute",
    width: 310,
    height: 310,
    left: -35,
    top: -35,
    borderRadius: 155,
    backgroundColor: palette.gold,
  },
  outerRing: {
    position: "absolute",
    width: 280,
    height: 280,
    left: -20,
    top: -20,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: "#D6BC7D12",
  },
  arch: {
    position: "absolute",
    top: 18,
    left: 44,
    width: 152,
    height: 198,
    borderTopLeftRadius: 76,
    borderTopRightRadius: 76,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderWidth: 1,
    borderColor: "#D6BC7D65",
  },
  archInner: {
    position: "absolute",
    top: 27,
    left: 53,
    width: 134,
    height: 180,
    borderTopLeftRadius: 67,
    borderTopRightRadius: 67,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderWidth: 1,
    borderColor: "#D6BC7D22",
  },
  rays: { position: "absolute", left: 79, top: 62 },
  leftPage: { position: "absolute", top: 112, left: 69 },
  rightPage: { position: "absolute", top: 112, left: 118 },
  spine: {
    position: "absolute",
    left: 119,
    top: 128,
    width: 1.3,
    height: 49,
    backgroundColor: palette.gold,
  },
  underBook: {
    position: "absolute",
    left: 104,
    top: 195,
    width: 32,
    height: 1,
    backgroundColor: "#D6BC7D80",
  },
  wordmark: {
    position: "absolute",
    top: "50%",
    marginTop: 53,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  name: {
    fontSize: 64,
    lineHeight: 76,
    letterSpacing: -2,
    color: palette.ivory,
    textAlign: "center",
  },
  bible: {
    color: palette.gold,
    fontSize: 11,
    letterSpacing: 5,
    lineHeight: 22,
    marginTop: 1,
    paddingLeft: 5,
  },
  divider: {
    width: 34,
    height: 1,
    backgroundColor: "#D6BC7D70",
    marginTop: 23,
    marginBottom: 17,
  },
  tagline: {
    color: "#E3E3D2",
    fontSize: 21,
    lineHeight: 29,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: "9%",
    width: "100%",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 25,
  },
  footerTitle: {
    color: "#C3CCBB",
    fontSize: 8,
    lineHeight: 16,
    letterSpacing: 2.8,
    textAlign: "center",
  },
  footerStatus: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { height: 4, width: 4, borderRadius: 2, backgroundColor: palette.gold },
  footerDetail: {
    color: "#8FA492",
    fontSize: 10,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
});
