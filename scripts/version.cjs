const fs = require("node:fs");
const path = require("node:path");

const files = {
  app: "app.json",
  pkg: "package.json",
  lock: "package-lock.json",
  gradle: "android/app/build.gradle",
  plist: "ios/AllexiBible/Info.plist",
  project: "ios/AllexiBible.xcodeproj/project.pbxproj",
};
const json = (value) => JSON.stringify(value, null, 2) + "\n";
function version(value) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value))
    throw new Error("Use a numeric store version such as 1.2.3.");
  const parts = value.split(".").map(Number);
  if (parts.some((n) => !Number.isSafeInteger(n))) throw new Error("Version is too large.");
  return parts;
}
function counter(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > maximum)
    throw new Error(`${label} must be a positive integer${maximum < Number.MAX_SAFE_INTEGER ? ` no greater than ${maximum}` : ""}.`);
  return Number(value);
}
function captures(text, pattern, label, count) {
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== count) throw new Error(`Expected ${count} ${label} field(s), found ${matches.length}. No files were changed.`);
  return matches.map((m) => m[1]);
}
function replace(text, pattern, value, label, count = 1) {
  captures(text, pattern, label, count);
  return text.replace(pattern, value);
}
const plistPattern = (key) => new RegExp(`(<key>${key}</key>\\s*<string>)([^<]+)(</string>)`, "g");

function plan(root, options = {}) {
  const operation = options.operation ?? "build";
  if (!["build", "patch", "minor", "major", "sync", "check"].includes(operation))
    throw new Error("Choose build, patch, minor, major, sync or check.");
  if (operation === "check" && (options.version || options.iosBuild || options.androidCode))
    throw new Error("Check does not accept version overrides.");
  const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(path.join(root, file), "utf8")]));
  const app = JSON.parse(source.app), pkg = JSON.parse(source.pkg), lock = JSON.parse(source.lock);
  const parts = version(app.expo.version);
  if (!lock.packages?.[""]) throw new Error("Expected a modern package-lock.json with a root package.");
  const iosProject = captures(source.project, /CURRENT_PROJECT_VERSION = ([^;]+);/g, "Xcode build number", 2);
  const plistBuild = captures(source.plist, /<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/g, "CFBundleVersion", 1)[0];
  const android = captures(source.gradle, /\bversionCode\s+(\d+)\b/g, "Android versionCode", 1)[0];
  const iosCurrent = Math.max(...[
    ...iosProject.map((value) => value.replace(/^"|"$/g, "")),
    ...(plistBuild === "$(CURRENT_PROJECT_VERSION)" ? [] : [plistBuild]),
    ...(app.expo.ios?.buildNumber === undefined ? [] : [app.expo.ios.buildNumber]),
  ].map((n) => counter(n, "iOS build number")));
  const androidCurrent = Math.max(counter(android, "Android version code", 2100000000),
    app.expo.android?.versionCode === undefined ? 1 : counter(app.expo.android.versionCode, "Android version code", 2100000000));
  const increment = !["sync", "check"].includes(operation);
  const iosBuild = counter(options.iosBuild ?? iosCurrent + Number(increment), "iOS build number");
  const androidCode = counter(options.androidCode ?? androidCurrent + Number(increment), "Android version code", 2100000000);
  if (iosBuild < iosCurrent + Number(increment) || androidCode < androidCurrent + Number(increment))
    throw new Error("Build numbers must increase for a bump and cannot decrease during sync.");
  if (["major", "minor", "patch"].includes(operation)) {
    const index = { major: 0, minor: 1, patch: 2 }[operation];
    parts[index]++;
    for (let i = index + 1; i < parts.length; i++) parts[i] = 0;
  }
  const nextVersion = options.version ?? parts.join(".");
  const nextParts = version(nextVersion), previous = version(app.expo.version);
  const different = nextParts.findIndex((part, i) => part !== previous[i]);
  if (different >= 0 && nextParts[different] < previous[different]) throw new Error("The app version cannot decrease.");
  app.expo.version = pkg.version = lock.version = lock.packages[""].version = nextVersion;
  app.expo.ios ??= {};
  app.expo.android ??= {};
  app.expo.ios.buildNumber = String(iosBuild);
  app.expo.android.versionCode = androidCode;
  let plist = source.plist;
  for (const [key, value, macro] of [
    ["CFBundleShortVersionString", nextVersion, "$(MARKETING_VERSION)"],
    ["CFBundleVersion", String(iosBuild), "$(CURRENT_PROJECT_VERSION)"],
  ]) {
    const pattern = plistPattern(key);
    captures(plist, pattern, key, 1);
    plist = plist.replace(pattern, (_match, before, existing, after) => before + (existing === macro ? macro : value) + after);
  }
  const output = {
    app: json(app), pkg: json(pkg), lock: json(lock), plist,
    gradle: replace(replace(source.gradle, /(\bversionCode\s+)\d+\b/g,
      (_m, prefix) => prefix + androidCode, "Android versionCode"),
      /(\bversionName\s+")[^"]+("[ \t]*)/g, (_m, before, after) => before + nextVersion + after, "Android versionName"),
    project: replace(replace(source.project, /(CURRENT_PROJECT_VERSION = )[^;]+;/g,
      (_m, prefix) => prefix + iosBuild + ";", "Xcode build number", 2),
      /(MARKETING_VERSION = )[^;]+;/g, (_m, prefix) => prefix + nextVersion + ";", "Xcode app version", 2),
  };
  const changes = Object.entries(files).filter(([key]) => source[key] !== output[key])
    .map(([key, file]) => ({ file: path.join(root, file), before: source[key], after: output[key] }));
  const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
  return { changes, version: nextVersion, iosBuild, androidCode, remote: eas.cli?.appVersionSource === "remote" };
}

function write(plan) {
  const staged = [], written = [];
  try {
    for (const change of plan.changes) {
      const temp = `${change.file}.version-${process.pid}.tmp`;
      staged.push(temp);
      fs.writeFileSync(temp, change.after, { flag: "wx", mode: fs.statSync(change.file).mode });
    }
    for (let i = 0; i < plan.changes.length; i++) {
      fs.renameSync(staged[i], plan.changes[i].file);
      written.push(plan.changes[i]);
    }
  } catch (error) {
    for (const change of written) fs.writeFileSync(change.file, change.before);
    throw error;
  } finally {
    for (const temp of staged) if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

function parse(args) {
  const options = { operation: "build", dryRun: false };
  if (args[0] && !args[0].startsWith("--")) options.operation = args.shift();
  const names = { "--version": "version", "--ios-build": "iosBuild", "--android-code": "androidCode" };
  while (args.length) {
    const arg = args.shift();
    if (arg === "--dry-run") options.dryRun = true;
    else if (names[arg] && args[0] && !args[0].startsWith("--")) options[names[arg]] = args.shift();
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  return options;
}

if (require.main === module) {
  try {
    const options = parse(process.argv.slice(2));
    const result = plan(path.resolve(__dirname, ".."), options);
    console.log(`Version ${result.version} · iOS build ${result.iosBuild} · Android code ${result.androidCode}`);
    if (options.operation === "check") {
      if (result.changes.length) throw new Error(`Version fields differ in: ${result.changes.map((c) => path.basename(c.file)).join(", ")}. Run npm run version:sync.`);
      console.log("All local version fields match.");
    } else {
      if (!options.dryRun) write(result);
      console.log(`${options.dryRun ? "Would update" : "Updated"} ${result.changes.length} file(s).`);
    }
    if (result.remote) console.log("EAS cloud build numbers remain remote-managed and auto-increment independently of these local values.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { plan, write, parse };
