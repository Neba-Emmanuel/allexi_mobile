import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { authStorage } from "./authStorage";
import { createClient } from "@supabase/supabase-js";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: authStorage,
          persistSession: true,
          autoRefreshToken: Platform.OS === "web",
          detectSessionInUrl: false,
        },
      })
    : null;
export const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

export async function deleteAccount(password: string) {
  if (!supabase || !apiUrl)
    throw new Error("Connect to your account before deleting it.");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in again before deleting your account.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const result = await fetch(`${apiUrl.replace(/\/$/, "")}/v1/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password, confirmation: "DELETE" }),
      signal: controller.signal,
    });
    if (!result.ok) {
      const data = await result.json();
      throw new Error(data.error ?? "Account deletion failed.");
    }
  } finally {
    clearTimeout(timer);
  }
}

// The server, rather than client metadata, decides who may enter the editor.
export async function verifyAdministrator(session: Session) {
  if (Platform.OS !== "web" || !apiUrl)
    throw new Error("Administrator access is available on the web only.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/v1/admin/access`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    });
    const access = await response.json();
    if (!response.ok || access.admin !== true)
      throw new Error(response.status === 403
        ? "This account does not have administrator access."
        : "Administrator access could not be verified. Please try again.");
  } finally {
    clearTimeout(timer);
  }
}
