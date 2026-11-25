const fs = require("node:fs");
const path = require("node:path");
const { validateReleaseEnvironment } = require("./release-config.cjs");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function prepare(root, env) {
  const platform = env.RELEASE_PLATFORM;
  if (!["ios", "android"].includes(platform))
    throw new Error("Choose ios or android.");
  if (!env.EXPO_TOKEN) throw new Error("Set the EXPO_TOKEN GitHub secret.");
  if (!uuid.test(env.EXPO_PROJECT_ID ?? ""))
    throw new Error(
      "Set the EXPO_PROJECT_ID GitHub variable to the linked EAS project UUID.",
    );
  validateReleaseEnvironment(env);
  const submit = env.RELEASE_SUBMIT === "true";
  if (submit && platform === "ios" && !/^\d+$/.test(env.ASC_APP_ID ?? ""))
    throw new Error(
      "Set ASC_APP_ID to the numeric App Store Connect app ID before uploading iOS.",
    );
  const track = env.RELEASE_ANDROID_TRACK ?? "internal";
  if (!["internal", "production"].includes(track))
    throw new Error("Invalid Google Play track.");
  const appPath = path.join(root, "app.json"),
    easPath = path.join(root, "eas.json");
  const app = JSON.parse(fs.readFileSync(appPath, "utf8"));
  const existing = app.expo.extra?.eas?.projectId;
  if (existing && existing !== env.EXPO_PROJECT_ID)
    throw new Error(
      "EXPO_PROJECT_ID does not match the project committed in app.json.",
    );
  app.expo.extra = {
    ...app.expo.extra,
    eas: { ...app.expo.extra?.eas, projectId: env.EXPO_PROJECT_ID },
  };
  const eas = JSON.parse(fs.readFileSync(easPath, "utf8"));
  eas.submit ??= {};
  eas.submit.production ??= {};
  if (submit && platform === "ios")
    eas.submit.production.ios = {
      ...eas.submit.production.ios,
      ascAppId: env.ASC_APP_ID,
    };
  if (submit && platform === "android")
    eas.submit.production.android = {
      ...eas.submit.production.android,
      track,
      releaseStatus: "completed",
    };
  // Written only in the runner checkout; the project ID must remain in the archive
  // so the remote build evaluates the same configuration without a GitHub variable.
  fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + "\n");
  fs.writeFileSync(easPath, JSON.stringify(eas, null, 2) + "\n");
}
function successfulBuild(value, platform) {
  const rows = Array.isArray(value) ? value : [value];
  const match = rows.filter((row) => row?.platform?.toLowerCase() === platform);
  if (
    match.length !== 1 ||
    match[0].status !== "FINISHED" ||
    !uuid.test(match[0].id ?? "")
  )
    throw new Error(
      "Expected one finished build for the requested platform; upload cancelled.",
    );
  return match[0];
}
if (require.main === module) {
  try {
    if (process.argv[2] === "prepare") {
      prepare(process.cwd(), process.env);
      console.log(
        "Release configuration validated. Credentials were not written to app files.",
      );
    } else if (process.argv[2] === "result") {
      const build = successfulBuild(
        JSON.parse(fs.readFileSync(process.env.BUILD_RESULT_PATH, "utf8")),
        process.env.RELEASE_PLATFORM,
      );
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `id=${build.id}\n`);
      const url = `https://expo.dev/builds/${build.id}`;
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `### ${process.env.RELEASE_PLATFORM} build\n\n[Build details and download](${url})\n\nStore upload requested: ${process.env.RELEASE_SUBMIT === "true" ? "yes" : "no"}\n`,
      );
    } else throw new Error("Expected prepare or result.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { prepare, successfulBuild };
