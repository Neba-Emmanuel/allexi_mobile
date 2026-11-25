import AsyncStorage from "@react-native-async-storage/async-storage";
// Browser storage is origin-scoped; native sessions use the OS keychain.
export const authStorage = AsyncStorage;
