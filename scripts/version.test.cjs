const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { plan, write } = require("./version.cjs");

function fixture(t, macros = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "allexi-version-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const values = {
    "app.json": JSON.stringify({ expo: { version: "1.2.3", ios: { buildNumber: "7", supportsTablet: true }, android: { versionCode: 10 }, extra: { preserved: true } } }),
    "package.json": JSON.stringify({ name: "test", version: "1.2.3" }),
    "package-lock.json": JSON.stringify({ version: "1.2.3", packages: { "": { version: "1.2.3" }, "node_modules/other": { version: "5.0.0" } } }),
    "eas.json": JSON.stringify({ cli: { appVersionSource: "remote" }, build: { production: { autoIncrement: true } } }),
    "android/app/build.gradle": 'versionCode 12\nversionName "1.2.3"\n',
    "ios/AllexiBible/Info.plist": `<plist><dict><key>CFBundleShortVersionString</key><string>${macros ? "$(MARKETING_VERSION)" : "1.2.3"}</string><key>CFBundleVersion</key><string>${macros ? "$(CURRENT_PROJECT_VERSION)" : "9"}</string></dict></plist>`,
    "ios/AllexiBible.xcodeproj/project.pbxproj": 'CURRENT_PROJECT_VERSION = 9;\nMARKETING_VERSION = 1.0;\nCURRENT_PROJECT_VERSION = 9;\nMARKETING_VERSION = 1.0;\n',
  };
  for (const [file, content] of Object.entries(values)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  return { root, values };
}
const read = (root, file) => fs.readFileSync(path.join(root, file), "utf8");

test("patch updates every native and Expo field, preserving EAS and dependency versions", (t) => {
  const { root, values } = fixture(t);
  const next = plan(root, { operation: "patch" });
  assert.equal(next.version, "1.2.4");
  assert.equal(next.iosBuild, 10);
  assert.equal(next.androidCode, 13);
  assert.equal(next.changes.length, 6);
  write(next);
  const app = JSON.parse(read(root, "app.json"));
  assert.equal(app.expo.version, "1.2.4");
  assert.equal(app.expo.ios.buildNumber, "10");
  assert.equal(app.expo.android.versionCode, 13);
  assert.equal(app.expo.ios.supportsTablet, true);
  assert.equal(app.expo.extra.preserved, true);
  assert.equal(JSON.parse(read(root, "package.json")).version, "1.2.4");
  const lock = JSON.parse(read(root, "package-lock.json"));
  assert.equal(lock.version, "1.2.4");
  assert.equal(lock.packages[""].version, "1.2.4");
  assert.equal(lock.packages["node_modules/other"].version, "5.0.0");
  assert.match(read(root, "android/app/build.gradle"), /versionCode 13\nversionName "1.2.4"/);
  assert.match(read(root, "ios/AllexiBible/Info.plist"), /<string>10<\/string>/);
  assert.equal((read(root, "ios/AllexiBible.xcodeproj/project.pbxproj").match(/MARKETING_VERSION = 1.2.4;/g) ?? []).length, 2);
  assert.equal(read(root, "eas.json"), values["eas.json"]);
  assert.equal(plan(root, { operation: "check" }).changes.length, 0);
});

test("sync aligns mismatched files without incrementing; later build-only bumps retain the app version", (t) => {
  const { root } = fixture(t);
  const synced = plan(root, { operation: "sync" });
  assert.equal(synced.iosBuild, 9);
  assert.equal(synced.androidCode, 12);
  write(synced);
  const bumped = plan(root);
  assert.equal(bumped.version, "1.2.3");
  assert.equal(bumped.iosBuild, 10);
  assert.equal(bumped.androidCode, 13);
});

test("minor and major bumps reset lower version components and accept higher store counters", (t) => {
  const { root } = fixture(t);
  assert.equal(plan(root, { operation: "minor" }).version, "1.3.0");
  assert.equal(plan(root, { operation: "major" }).version, "2.0.0");
  const next = plan(root, { version: "2.4.0", iosBuild: "25", androidCode: "40" });
  assert.equal(next.version, "2.4.0");
  assert.equal(next.iosBuild, 25);
  assert.equal(next.androidCode, 40);
});

test("invalid values and unexpected native structure fail before any file changes", (t) => {
  const { root, values } = fixture(t);
  for (const options of [
    { version: "1.2" }, { version: "1.0.0" }, { version: "1.3.0-beta" },
    { iosBuild: "9" }, { androidCode: "0" }, { androidCode: "2100000001" },
  ]) assert.throws(() => write(plan(root, options)));
  for (const [file, content] of Object.entries(values)) assert.equal(read(root, file), content);
  fs.writeFileSync(path.join(root, "android/app/build.gradle"), "// no version fields\n");
  assert.throws(() => write(plan(root)), /Android versionCode/);
  assert.equal(read(root, "package.json"), values["package.json"]);
});

test("Xcode build-setting references in Info.plist remain references", (t) => {
  const { root } = fixture(t, true);
  write(plan(root, { operation: "patch" }));
  const plist = read(root, "ios/AllexiBible/Info.plist");
  assert.ok(plist.includes("$(MARKETING_VERSION)"));
  assert.ok(plist.includes("$(CURRENT_PROJECT_VERSION)"));
  assert.equal(plan(root, { operation: "check" }).changes.length, 0);
});

test("the CLI dry-run previews a bump without changing the project", (t) => {
  const { root, values } = fixture(t);
  fs.mkdirSync(path.join(root, "scripts"));
  fs.copyFileSync(__filename.replace("version.test.cjs", "version.cjs"), path.join(root, "scripts/version.cjs"));
  const result = spawnSync(process.execPath, [path.join(root, "scripts/version.cjs"), "patch", "--dry-run"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Would update 6 file/);
  assert.match(result.stdout, /remote-managed/);
  for (const [file, content] of Object.entries(values)) assert.equal(read(root, file), content);
});
