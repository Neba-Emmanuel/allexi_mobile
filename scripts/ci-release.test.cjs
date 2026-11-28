const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { prepare, successfulBuild, buildReference, checkAndroidCredentials } = require("./ci-release.cjs");
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
    JSON.stringify({ expo: { name: "Allexi", android: { package: "com.allexi.bible" }, extra: { preserved: true } } }),
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

test("auto-submit output may contain a cached build status; its exact ID must be refreshed", () => {
  const cached = { id, platform: "IOS", status: "IN_QUEUE", submissions: [{ status: "FINISHED" }] };
  assert.equal(buildReference([cached], "ios").id, id);
  assert.throws(() => successfulBuild([cached], "ios", id), /not FINISHED/);
  assert.equal(successfulBuild({ ...cached, status: "FINISHED" }, "ios", id).id, id);
  assert.throws(() => successfulBuild({ ...cached, status: "FINISHED" }, "ios", "00000000-0000-4000-8000-000000000002"), /does not match/);
  assert.throws(() => buildReference([cached, cached], "ios"), /exactly one/);
});

test("Android credential preflight checks the linked project and submission assignment without fetching key material", async (t) => {
  const root = fixture(t);
  const androidEnv = { ...env, RELEASE_PLATFORM: "android", RELEASE_SUBMIT: "true" };
  let queried = false;
  const request = async (_url, options) => {
    queried = true;
    const body = JSON.parse(options.body);
    assert.equal(body.variables.appId, id);
    assert.equal(body.variables.applicationId, "com.allexi.bible");
    assert.equal(options.headers.Authorization, `Bearer ${env.EXPO_TOKEN}`);
    assert.ok(!body.query.includes("privateKey"));
    assert.ok(!body.query.includes("googleServiceAccountKeyJson"));
    return new Response(JSON.stringify({ data: { app: { byId: {
      id, androidAppCredentials: [{ applicationIdentifier: "com.allexi.bible", googleServiceAccountKeyForSubmissions: { id: "credential-id" } }],
    } } } }));
  };
  await checkAndroidCredentials(root, androidEnv, request);
  assert.equal(queried, true);
  const missing = async () => new Response(JSON.stringify({ data: { app: { byId: { id, androidAppCredentials: [] } } } }));
  await assert.rejects(checkAndroidCredentials(root, androidEnv, missing), /No Google Play submission key is assigned/);
  const denied = async () => new Response(JSON.stringify({ errors: [{ message: "Not authorized" }] }));
  await assert.rejects(checkAndroidCredentials(root, androidEnv, denied), /GitHub EXPO_TOKEN/);
  await checkAndroidCredentials(root, { ...androidEnv, RELEASE_PLATFORM: "ios" }, async () => { throw new Error("iOS must not query Android credentials"); });
});

test("Android submission pins the native application identifier and rejects conflicting Expo metadata", (t) => {
  const root = fixture(t);
  const androidEnv = { ...env, RELEASE_PLATFORM: "android", RELEASE_SUBMIT: "true" };
  prepare(root, androidEnv);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "eas.json"))).submit.production.android.applicationId, "com.allexi.bible");
  fs.mkdirSync(path.join(root, "android/app"), { recursive: true });
  fs.writeFileSync(path.join(root, "android/app/build.gradle"), 'applicationId "com.other.app"');
  assert.throws(() => prepare(root, androidEnv), /differs from app.json/);
});

test("result processing refreshes the same build ID and rejects an unrefreshed cached status", (t) => {
  const root = fixture(t);
  const resultPath = path.join(root, "build.json");
  const output = path.join(root, "output");
  const summary = path.join(root, "summary");
  const processEnv = {
    ...process.env, RELEASE_PLATFORM: "ios", RELEASE_SUBMIT: "true",
    BUILD_RESULT_PATH: resultPath, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary,
  };
  const run = (command, extra = {}) => spawnSync(process.execPath, [path.join(__dirname, "ci-release.cjs"), command], {
    cwd: root, env: { ...processEnv, ...extra }, encoding: "utf8",
  });
  fs.writeFileSync(resultPath, JSON.stringify([{ id, platform: "IOS", status: "IN_QUEUE" }]));
  assert.equal(run("reference").status, 0);
  assert.equal(fs.readFileSync(output, "utf8"), `id=${id}\n`);
  const stale = run("result", { EXPECTED_BUILD_ID: id });
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /not FINISHED/);
  assert.equal(fs.existsSync(summary), false);
  fs.writeFileSync(resultPath, JSON.stringify({ id, platform: "IOS", status: "FINISHED" }));
  const refreshed = run("result", { EXPECTED_BUILD_ID: id });
  assert.equal(refreshed.status, 0, refreshed.stderr);
  assert.match(fs.readFileSync(summary, "utf8"), /Build status: FINISHED \(refreshed by exact ID\)/);
});

test("credential/config inspection succeeds without deployment settings in production profiles", () => {
  const config = require("../app.config.js");
  const previous = process.env.APP_ENV;
  try {
    process.env.APP_ENV = "production";
    const metadata = {
      name: "Allexi Bible",
      ios: { bundleIdentifier: "com.allexi.bible" },
    };
    assert.equal(config({ config: metadata }), metadata);
  } finally {
    if (previous === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = previous;
  }
});
test("production builds still reject missing deployment settings while development is allowed", () => {
  const { validateBuild } = require("./validate-build.cjs");
  assert.doesNotThrow(() => validateBuild({}));
  assert.throws(
    () => validateBuild({ APP_ENV: "production" }),
    /Release requires/,
  );
  assert.throws(
    () => validateBuild({ EAS_BUILD_PROFILE: "production" }),
    /Release requires/,
  );
  assert.doesNotThrow(() => validateBuild({ ...env, APP_ENV: "production" }));
});
