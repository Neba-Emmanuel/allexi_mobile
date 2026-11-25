import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { supabase } from "../lib/auth";
import { Button, Txt, styles, useTheme } from "./ui";
export default function AccountRecovery({ onBack }: { onBack: () => void }) {
  const t = useTheme();
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [password, setPassword] = useState("");
  const [sent, setSent] = useState(false),
    [verified, setVerified] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit() {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!sent) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
        );
        if (error) throw error;
        setSent(true);
        setMessage(
          "If this email has an account, a recovery code has been sent.",
        );
      } else {
        if (!verified) {
          const result = await supabase.auth.verifyOtp({
            email: email.trim(),
            token: code.trim(),
            type: "recovery",
          });
          if (result.error) throw result.error;
          setVerified(true);
        }
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setPassword("");
        setCode("");
        setMessage("Password updated. You are signed in.");
        setSent(false);
        setVerified(false);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Recovery could not be completed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <Txt muted>Recover access using the code sent to your email.</Txt>
      <TextInput
        accessibilityLabel="Recovery email"
        placeholder="Email address"
        placeholderTextColor={t.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!busy && !sent}
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { color: t.text, borderColor: t.line }]}
      />
      {sent ? (
        <>
          <TextInput
            accessibilityLabel="Recovery code"
            placeholder="Email recovery code"
            placeholderTextColor={t.muted}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            value={code}
            onChangeText={setCode}
            editable={!busy}
            style={[styles.input, { color: t.text, borderColor: t.line }]}
          />
          <TextInput
            accessibilityLabel="New password"
            placeholder="New password (at least 12 characters)"
            placeholderTextColor={t.muted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            style={[styles.input, { color: t.text, borderColor: t.line }]}
          />
        </>
      ) : null}
      <Button
        disabled={
          busy ||
          !email.trim() ||
          (sent && (!code.trim() || password.length < 12))
        }
        onPress={() => void submit()}
      >
        {busy
          ? "Please wait…"
          : sent
            ? "Set new password"
            : "Send recovery code"}
      </Button>
      {sent ? (
        <Button
          secondary
          disabled={busy}
          onPress={() => {
            setSent(false);
            setVerified(false);
            setCode("");
            setPassword("");
          }}
        >
          Request another code
        </Button>
      ) : null}
      {message ? <Txt accessibilityRole="alert">{message}</Txt> : null}
      <Button secondary disabled={busy} onPress={onBack}>
        Back to settings
      </Button>
    </View>
  );
}
