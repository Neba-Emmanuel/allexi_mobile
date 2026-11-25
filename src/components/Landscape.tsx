import React from "react";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Circle,
  G,
} from "react-native-svg";

export default function Landscape() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 800 340"
      preserveAspectRatio="xMidYMid slice"
      accessibilityLabel="An illustrated river winding through quiet green hills at sunrise"
    >
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop stopColor="#E8DDC0" />
          <Stop offset="1" stopColor="#B5BBA0" />
        </LinearGradient>
        <LinearGradient id="land" x1="0" y1="0" x2="0" y2="1">
          <Stop stopColor="#78866A" />
          <Stop offset="1" stopColor="#243F32" />
        </LinearGradient>
        <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <Stop stopColor="#112F20" stopOpacity="0" />
          <Stop offset="1" stopColor="#112F20" stopOpacity=".7" />
        </LinearGradient>
      </Defs>
      <Rect width="800" height="340" fill="url(#sky)" />
      <Circle cx="560" cy="89" r="35" fill="#F7EBCB" opacity=".8" />
      <Path
        d="M0 175 Q90 70 220 153 T455 149 T800 125 V340 H0Z"
        fill="#9BA58B"
      />
      <Path
        d="M0 186 Q160 112 290 178 T540 164 T800 174 V340 H0Z"
        fill="#7C907A"
      />
      <Path
        d="M0 210 Q130 150 280 214 T540 210 T800 195 V340 H0Z"
        fill="url(#land)"
      />
      <Path
        d="M465 168 Q410 195 455 214 T392 258 Q325 280 351 340 H560 Q433 288 482 262 T495 217 Q445 191 477 168Z"
        fill="#C5C6A9"
        opacity=".85"
      />
      <Path d="M0 278 Q131 220 269 274 T350 340 H0Z" fill="#3E5942" />
      <Path d="M800 245 Q640 217 569 291 L598 340 H800Z" fill="#3D5540" />
      <G fill="#2E4937">
        <Path d="M105 260 L112 122 Q142 187 124 260Z" />
        <Path d="M140 263 L151 156 Q176 210 158 263Z" />
        <Path d="M660 247 L671 119 Q701 186 680 247Z" />
        <Path d="M705 261 L717 160 Q744 222 725 261Z" />
      </G>
      <Path
        d="M310 87 q8 -9 16 0 q8 -9 16 0 M356 72 q6 -7 12 0 q6 -7 12 0"
        stroke="#69745E"
        strokeWidth="2"
        fill="none"
      />
      <Rect width="800" height="340" fill="url(#shade)" />
    </Svg>
  );
}
