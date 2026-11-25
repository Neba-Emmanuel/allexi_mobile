import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSecureSessionStorage } from "./secureSession";
const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
export const authStorage = createSecureSessionStorage(
  {
    getItem: (key) => SecureStore.getItemAsync(key, options),
    setItem: (key, value) => SecureStore.setItemAsync(key, value, options),
    removeItem: (key) => SecureStore.deleteItemAsync(key, options),
  },
  AsyncStorage,
  Crypto.randomUUID,
);
