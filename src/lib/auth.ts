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
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
export const apiUrl = process.env.EXPO_PUBLIC_API_URL;

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
