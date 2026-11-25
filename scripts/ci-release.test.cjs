const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { prepare, successfulBuild } = require("./ci-release.cjs");
const id = "00000000-0000-4000-8000-000000000001";
const env = {
  RELEASE_PLATFORM: "ios",
  RELEASE_SUBMIT: "false",
  EXPO_TOKEN: "test-token-never-persist",
  EXPO_PROJECT_ID: id,
  EXPO_PUBLIC_SUPABASE_URL: "https://allexi.supabase.co",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  EXPO_PUBLIC_API_URL: "https://api.allexi.test",
  EXPO_PUBLIC_PRIVACY_URL: "https://allexi.test/privacy",
  EXPO_PUBLIC_SUPPORT_URL: "https://allexi.test/support",
};
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "allexi-release-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(root, "app.json"),
    JSON.stringify({ expo: { name: "Allexi", extra: { preserved: true } } }),
  );
  fs.writeFileSync(
    path.join(root, "eas.json"),
    JSON.stringify({ build: { production: {} }, submit: { production: {} } }),
  );
  return root;
}
test("build-only preparation links project without adding credentials or requiring store access", (t) => {
  const root = fixture(t);
  prepare(root, env);
  const app = JSON.parse(fs.readFileSync(path.join(root, "app.json")));
  assert.equal(app.expo.extra.eas.projectId, id);
  assert.equal(app.expo.extra.preserved, true);
  assert.ok(
    !fs
      .readFileSync(path.join(root, "app.json"), "utf8")
      .includes(env.EXPO_TOKEN),
  );
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(root, "eas.json"))).submit.production,
    {},
  );
});
test("iOS upload requires numeric app ID and preserves existing settings", (t) => {
  const root = fixture(t);
  assert.throws(
    () => prepare(root, { ...env, RELEASE_SUBMIT: "true" }),
    /ASC_APP_ID/,
  );
  prepare(root, { ...env, RELEASE_SUBMIT: "true", ASC_APP_ID: "1234567890" });
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(root, "eas.json"))).submit.production
      .ios.ascAppId,
    "1234567890",
  );
});
test("Android upload uses internal track by default and accepts explicit production selection", (t) => {
  const root = fixture(t);
  prepare(root, {
    ...env,
    RELEASE_PLATFORM: "android",
    RELEASE_SUBMIT: "true",
  });
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(root, "eas.json"))).submit.production
      .android.track,
    "internal",
  );
  prepare(root, {
    ...env,
    RELEASE_PLATFORM: "android",
    RELEASE_SUBMIT: "true",
    RELEASE_ANDROID_TRACK: "production",
  });
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(root, "eas.json"))).submit.production
      .android.track,
    "production",
  );
});
test("invalid configuration and project mismatches fail before mutating files", (t) => {
  const root = fixture(t);
  for (const invalid of [
    { EXPO_TOKEN: "" },
    { EXPO_PROJECT_ID: "bad" },
    { EXPO_PUBLIC_API_URL: "http://localhost:3001" },
    { RELEASE_PLATFORM: "all" },
    { RELEASE_ANDROID_TRACK: "unknown" },
  ])
    assert.throws(() => prepare(root, { ...env, ...invalid }));
  prepare(root, env);
  assert.throws(
    () =>
      prepare(root, {
        ...env,
        EXPO_PROJECT_ID: "00000000-0000-4000-8000-000000000002",
      }),
    /does not match/,
  );
});
test("submission selects exactly one successful build of the requested platform", () => {
  const build = { id, platform: "IOS", status: "FINISHED" };
  assert.equal(successfulBuild([build], "ios").id, id);
  assert.equal(successfulBuild(build, "ios").id, id);
  for (const value of [
    [{ ...build, status: "ERRORED" }],
    [build, build],
    [{ ...build, platform: "ANDROID" }],
    [{ ...build, id: "bad" }],
    [],
  ])
    assert.throws(() => successfulBuild(value, "ios"));
});
