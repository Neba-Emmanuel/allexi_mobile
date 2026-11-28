const fs = require("node:fs");
const path = require("node:path");
const { validateReleaseEnvironment } = require("./release-config.cjs");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function androidApplicationId(root, app) {
  const declared = app.expo.android?.package;
  const gradlePath = path.join(root, "android/app/build.gradle");
  const native = fs.existsSync(gradlePath)
    ? fs.readFileSync(gradlePath, "utf8").match(/\bapplicationId\s+["']([^"']+)["']/)?.[1]
    : undefined;
  if (native && declared && native !== declared)
    throw new Error("Native Android applicationId differs from app.json; align them before submitting.");
  const applicationId = native ?? declared;
  if (!/^[A-Za-z]\w*(?:\.[A-Za-z]\w*)+$/.test(applicationId ?? ""))
    throw new Error("A valid Android applicationId is required for Play submission.");
  return applicationId;
}
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
      applicationId: androidApplicationId(root, app),
      track,
      releaseStatus: "completed",
    };
  // Written only in the runner checkout; the project ID must remain in the archive
  // so the remote build evaluates the same configuration without a GitHub variable.
  fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + "\n");
  fs.writeFileSync(easPath, JSON.stringify(eas, null, 2) + "\n");
}
function buildReference(value, platform) {
  if (!["ios", "android"].includes(platform)) throw new Error("Choose ios or android.");
  const rows = Array.isArray(value) ? value : [value];
  const match = rows.filter((row) => typeof row?.platform === "string" && row.platform.toLowerCase() === platform);
  if (
    match.length !== 1 ||
    !uuid.test(match[0].id ?? "")
  )
    throw new Error("Expected exactly one build ID for the requested platform. No new submission was started by result processing.");
  return match[0];
}
function successfulBuild(value, platform, expectedId) {
  const build = buildReference(value, platform);
  if (expectedId && (!uuid.test(expectedId) || build.id !== expectedId))
    throw new Error("Refreshed build ID does not match the build started by this job.");
  if (build.status !== "FINISHED")
    throw new Error(`Build ${build.id} is ${build.status ?? "missing a status"}, not FINISHED. This check does not cancel any existing store upload.`);
  return build;
}

async function checkAndroidCredentials(root, env, request = fetch) {
  if (env.RELEASE_PLATFORM !== "android" || env.RELEASE_SUBMIT !== "true") return;
  if (!env.EXPO_TOKEN || !uuid.test(env.EXPO_PROJECT_ID ?? ""))
    throw new Error("Set EXPO_TOKEN and EXPO_PROJECT_ID before checking submission credentials.");
  const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
  const applicationId = androidApplicationId(root, app);
  const response = await request("https://api.expo.dev/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.EXPO_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query AndroidSubmissionCredentialCheck($appId: String!, $applicationId: String!) {
        app { byId(appId: $appId) { id androidAppCredentials(filter: { applicationIdentifier: $applicationId, legacyOnly: false }) {
          applicationIdentifier googleServiceAccountKeyForSubmissions { id }
        } } }
      }`,
      variables: { appId: env.EXPO_PROJECT_ID, applicationId },
    }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length)
    throw new Error("The GitHub EXPO_TOKEN could not read Android submission credential metadata. Check its access to the linked Expo project.");
  const project = result.data?.app?.byId;
  if (project?.id !== env.EXPO_PROJECT_ID)
    throw new Error("Credential lookup returned a different Expo project.");
  const credentials = project.androidAppCredentials?.filter((row) => row.applicationIdentifier === applicationId) ?? [];
  if (!credentials[0]?.googleServiceAccountKeyForSubmissions?.id)
    throw new Error(`No Google Play submission key is assigned to ${applicationId} in this Expo project for the GitHub token. In Expo Credentials, open this Android application identifier and assign the existing Google service account key under Play Store submissions (not FCM). Or run eas credentials --platform android interactively. No build was started.`);
  console.log(`Google Play submission key assignment verified for ${applicationId}. No key material was requested.`);
}
async function main() {
  try {
    if (process.argv[2] === "prepare") {
      prepare(process.cwd(), process.env);
      console.log(
        "Release configuration validated. Credentials were not written to app files.",
      );
    } else if (process.argv[2] === "credentials") {
      await checkAndroidCredentials(process.cwd(), process.env);
    } else if (process.argv[2] === "reference") {
      const build = buildReference(JSON.parse(fs.readFileSync(process.env.BUILD_RESULT_PATH, "utf8")), process.env.RELEASE_PLATFORM);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `id=${build.id}\n`);
    } else if (process.argv[2] === "result") {
      const build = successfulBuild(
        JSON.parse(fs.readFileSync(process.env.BUILD_RESULT_PATH, "utf8")),
        process.env.RELEASE_PLATFORM,
        process.env.EXPECTED_BUILD_ID,
      );
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `id=${build.id}\n`);
      const url = `https://expo.dev/builds/${build.id}`;
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `### ${process.env.RELEASE_PLATFORM} build\n\n[Build details and download](${url})\n\nBuild status: FINISHED (refreshed by exact ID).\n\nEAS auto-submission requested: ${process.env.RELEASE_SUBMIT === "true" ? "yes" : "no"}. Store processing and validation are tracked separately in Expo and the store console.\n`,
      );
    } else throw new Error("Expected prepare, credentials, reference or result.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
if (require.main === module) void main();
module.exports = { prepare, successfulBuild, buildReference, checkAndroidCredentials };
