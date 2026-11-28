import "react-native-url-polyfill/auto";
import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";
import { Platform } from "react-native";
import App from "./src/App";
import { publicPageRedirect } from "./src/lib/publicPageRoutes";
// Keep the native launch frame until the animated React splash has laid out.
const pageRedirect = Platform.OS === "web" && typeof window !== "undefined"
  ? publicPageRedirect(window.location.pathname, window.location.search, window.location.hash)
  : null;
if (pageRedirect) {
  window.location.replace(pageRedirect);
} else {
  void SplashScreen.preventAutoHideAsync().catch(() => {});
  registerRootComponent(App);
}
