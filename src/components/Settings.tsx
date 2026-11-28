import React, { useEffect, useState } from "react";
import { Image, Platform, Pressable, TextInput, View } from "react-native";
import { useContent } from "../lib/content";
import { useStore } from "../lib/store";
import { apiUrl, supabase, deleteAccount, verifyAdministrator } from "../lib/auth";
import { Button, Icon, Label, Sheet, Txt, styles, useTheme } from "./ui";
import About from "./About";
import Help, { type HelpPage } from "./Help";
import AccountRecovery from "./AccountRecovery";
import { appVersion } from "../data/version";

export default function Settings({
  visible,
  onClose,
  onAdmin,
}: {
  visible: boolean;
  onClose: () => void;
  onAdmin: () => void;
}) {
  const { editionName, edition } = useContent();
  const t = useTheme(),
    s = useStore(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [showAbout, setShowAbout] = useState(false),
    [recovering, setRecovering] = useState(false),
    [deleting, setDeleting] = useState(false);
  const [helpPage, setHelpPage] = useState<HelpPage | null>(null);
  useEffect(() => {
    if (!visible) {
      setShowAbout(false);
      setHelpPage(null);
      setRecovering(false);
      setDeleting(false);
      setPassword("");
      setMessage("");
    }
  }, [visible]);
  async function authenticate() {
    if (Platform.OS !== "web" || !supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (result.error) throw result.error;
      await verifyAdministrator(result.data.session);
      setPassword("");
      setMessage("Administrator signed in. Open the admin workspace to manage scripture.");
    } catch (e) {
      await supabase.auth.signOut({ scope: "local" });
      setMessage(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }
  async function removeAccount() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await deleteAccount(password);
      await s.clearAccount();
      setPassword("");
      setDeleting(false);
      setMessage("Your account and synced study data have been deleted.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Account deletion could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (helpPage)
    return (
      <Sheet visible={visible} title={helpPage === "support" ? "Support" : helpPage === "privacy" ? "Privacy policy" : "Terms of Service"} onClose={onClose}>
        <Help key={helpPage} page={helpPage} onBack={() => setHelpPage(null)} onNavigate={setHelpPage} />
      </Sheet>
    );
  if (Platform.OS === "web" && recovering)
    return (
      <Sheet visible={visible} title="Recover your account" onClose={onClose}>
        <AccountRecovery onBack={() => setRecovering(false)} />
      </Sheet>
    );
  if (showAbout)
    return (
      <Sheet visible={visible} title="About Allexi Bible" onClose={onClose}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to settings"
          onPress={() => setShowAbout(false)}
          style={[styles.row, { minHeight: 44 }]}
        >
          <Icon name="arrow-left" size={16} />
          <Txt muted style={{ fontSize: 12 }}>
            Back to settings
          </Txt>
        </Pressable>
        <About />
      </Sheet>
    );
  return (
    <Sheet visible={visible} title="Settings & About" onClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="About Allexi Bible"
        onPress={() => setShowAbout(true)}
        style={[
          styles.row,
          { padding: 18, backgroundColor: t.surface, borderRadius: 6 },
        ]}
      >
        <Image
          source={require("../../assets/icon.png")}
          style={{ width: 48, height: 48, borderRadius: 11 }}
        />
        <View style={{ flex: 1 }}>
          <Txt>About Allexi Bible</Txt>
          <Txt muted style={{ fontSize: 11 }}>
            Our purpose and perspective
          </Txt>
        </View>
        <Icon name="chevron-right" size={18} />
      </Pressable>
      {Platform.OS === "web" ? (
      <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Admin workspace"
        onPress={onAdmin}
        style={[
          styles.row,
          {
            padding: 18,
            borderWidth: 1,
            borderColor: t.line,
            borderRadius: 6,
            minHeight: 70,
          },
        ]}
      >
        <Icon name="shield" />
        <View style={{ flex: 1 }}>
          <Txt>Admin workspace</Txt>
          <Txt muted style={{ fontSize: 11 }}>
            Manage editions, review progress, and publishing
          </Txt>
        </View>
        <Icon name="chevron-right" size={18} />
      </Pressable>
      <Label>ADMINISTRATOR ACCESS</Label>
      <Txt muted style={{ fontSize: 13 }}>
        Sign in with an approved administrator account to update chapters and
        verses. Reading does not require an account.
      </Txt>
      {!supabase || !apiUrl ? (
        <View
          style={{
            padding: 18,
            backgroundColor: t.surface,
            borderRadius: 6,
            gap: 8,
          }}
        >
          <Txt>Administrator access hasn’t been connected yet.</Txt>
          <Txt muted style={{ fontSize: 12 }}>
            You can continue reading and reflecting. The editorial workspace
            will be available once connected.
          </Txt>
        </View>
      ) : s.session ? (
        <>
          <Txt>{s.session.user.email}</Txt>
          <Txt muted>
            {s.online ? s.syncMessage : "Waiting for a connection to sync."}
          </Txt>
          <Txt muted style={{ fontSize: 11 }}>
            {s.pending} pending {s.pending === 1 ? "change" : "changes"}
          </Txt>
          <Button
            disabled={s.syncing || !s.online}
            icon="refresh-cw"
            onPress={() => void s.sync()}
          >
            {s.syncing ? "Syncing…" : "Sync now"}
          </Button>
          <Button
            secondary
            onPress={() =>
              void supabase!.auth
                .signOut({ scope: "local" })
                .then(({ error }) => {
                  if (error) setMessage(error.message);
                })
                .catch(() => setMessage("Could not sign out"))
            }
          >
            Sign out
          </Button>
          {deleting ? (
            <View style={{ gap: 12 }}>
              <Txt>Delete your account permanently?</Txt>
              <Txt muted>
                Your synced notes, bookmarks, highlights and reading place will
                be removed, including this account’s study data on this device.
                This cannot be undone. Published editorial text is retained.
              </Txt>
              <TextInput
                accessibilityLabel="Confirm deletion password"
                placeholder="Current password"
                placeholderTextColor={t.muted}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                style={[styles.input, { color: t.text, borderColor: t.line }]}
              />
              <Button
                disabled={busy || !password || !s.online || s.syncing}
                onPress={() => void removeAccount()}
              >
                {busy ? "Deleting…" : "Permanently delete my account"}
              </Button>
              <Button
                secondary
                disabled={busy}
                onPress={() => {
                  setDeleting(false);
                  setPassword("");
                }}
              >
                Cancel deletion
              </Button>
            </View>
          ) : (
            <Button
              secondary
              disabled={busy || s.syncing}
              onPress={() => {
                setDeleting(true);
                setPassword("");
                setMessage("");
              }}
            >
              Delete my account
            </Button>
          )}
        </>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Email address"
            placeholder="Email address"
            placeholderTextColor={t.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { borderColor: t.line, color: t.text }]}
          />
          <TextInput
            accessibilityLabel="Password"
            placeholder="Password"
            placeholderTextColor={t.muted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { borderColor: t.line, color: t.text }]}
          />
          <View style={{ gap: 10 }}>
            <Button
              disabled={busy || !email || !password}
              onPress={() => void authenticate()}
            >
              Sign in as administrator
            </Button>
            <Button
              secondary
              disabled={busy}
              onPress={() => setRecovering(true)}
            >
              Forgot password?
            </Button>
          </View>
        </>
      )}
      {message ? (
        <Txt accessibilityRole="alert" style={{ color: t.gold }}>
          {message}
        </Txt>
      ) : null}
      </>
      ) : null}
      <View style={{ height: 1, backgroundColor: t.line }} />
      <Label>SUPPORT & LEGAL</Label>
      <Txt muted style={{ fontSize: 12 }}>
        Read without an account. Contact us for help, privacy questions, or
        account deletion requests.
      </Txt>
      <Button secondary icon="help-circle" onPress={() => setHelpPage("support")}>
        Get support
      </Button>
      <Button secondary icon="shield" onPress={() => setHelpPage("privacy")}>
        Privacy policy
      </Button>
      <Button secondary icon="file-text" onPress={() => setHelpPage("terms")}>
        Terms of Service
      </Button>
      <Label>READING EDITION</Label>
      <Txt muted style={{ fontSize: 12 }}>
        {editionName}
        {edition === "kjv" ? " · Modern spelling" : ""}
      </Txt>
      <Txt muted style={{ fontSize: 11 }}>
        Allexi Bible · Version {appVersion}
      </Txt>
    </Sheet>
  );
}
