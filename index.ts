import "react-native-url-polyfill/auto";
import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";
import App from "./src/App";
// Keep the native launch frame until the animated React splash has laid out.
void SplashScreen.preventAutoHideAsync().catch(() => {});
registerRootComponent(App);
