# Build and store upload pipeline

The mobile repository is `Neba-Emmanuel/allexi_mobile`. Its GitHub Actions files live in this app's `.github/workflows/`, not the parent project's `.github/` directory. All commands below run inside this mobile folder. There is no root npm workspace and the backend is not needed by these workflows.

## What runs

- **Verify mobile:** every push and pull request installs dependencies, checks TypeScript, tests release configuration and exports all three JavaScript bundles. No store credentials are needed.
- **Mobile release:** manually run from GitHub Actions. Choose `ios`, `android` or `all`; every selected platform enables **EAS auto-submit**. Default is **iOS with TestFlight auto-submit**. Android automatically submits to Google Play. Google Play defaults to the **internal** track, with an explicit production option. iOS uploads go to App Store Connect/TestFlight. Apple App Review and public release are separate.
- Each selected platform gets its own EAS cloud build. GitHub waits for the build. For both platforms, `--auto-submit-with-profile production` hands the completed build directly to EAS Submit; no second upload step runs. Monitor the submission result in the Expo dashboard: a successful GitHub build does not establish that Apple processing or the auto-submission has completed. For Android, auto-submit is attached to the exact EAS build, so it never selects an unrelated “latest” build. Monitor completion in the Expo submissions dashboard.
- Before an Android build starts, the workflow checks submission-key assignment for the linked Expo project and native application ID using the same GitHub `EXPO_TOKEN`. This fetches credential IDs only, never private key material. After auto-submit finishes, the workflow extracts that exact build ID, fetches it again with `eas build:view`, and validates the fresh status instead of the potentially cached auto-submit JSON.
- Concurrent release runs are serialized. The two platform jobs within one run can build in parallel, subject to your Expo account's build limits. GitHub waits for EAS builds/submissions, so queue time counts toward the 120-minute job timeout. Interrupting GitHub does not necessarily cancel an already-started remote EAS build; check Expo before retrying.

## One-time Expo setup

1. Create or select the Expo project for `com.allexi.bible`. Link this app with `npx eas-cli@27.11.0 login` and `npx eas-cli@27.11.0 init`. Record its project UUID. If `init` asks for a manual dynamic-config edit, the workflow already writes the UUID into `app.json` from `EXPO_PROJECT_ID` in its temporary checkout; you can also commit `expo.extra.eas.projectId` yourself.
2. Configure the five `EXPO_PUBLIC_*` values below in the **Expo production environment**. Use real HTTPS endpoints, and only the public Supabase publishable/anon key.
3. Run a first production build interactively for each desired platform so signing credentials are configured:

```sh
npx eas-cli@27.11.0 build --platform ios --profile production
npx eas-cli@27.11.0 build --platform android --profile production
```

Production configuration must be available locally during initial setup as well (for example in your ignored `.env`). The local simulator/emulator debug builds are not a substitute for this signing setup.

4. Configure submission credentials in EAS:

```sh
npx eas-cli@27.11.0 credentials --platform ios
npx eas-cli@27.11.0 credentials --platform android
```

For iOS, assign an **App Store Connect API key** for Expo Submit; the `.p8` private key is stored in Expo credentials and never committed here. An API key authenticates uploads; signed builds also need the distribution certificate/provisioning profile configured above. Create the App Store Connect app record for `com.allexi.bible` and record its numeric Apple ID.

For Android, create the Play Console app and configure a **Google service account key for Play Store submissions** in EAS. Current Expo Submit supports the first upload directly and creates the first release on the internal testing track; a manual first upload is optional. Complete Play Console account, listing and testing requirements before promoting a public production release. See [Expo Android submission](https://docs.expo.dev/submit/android/).

## GitHub settings

Under **Settings → Environments**, create `production`. Add:

| Kind     | Name                                   | Value                                                             |
| -------- | -------------------------------------- | ----------------------------------------------------------------- |
| Secret   | `EXPO_TOKEN`                           | Expo personal access token with access to this project            |
| Variable | `EXPO_PROJECT_ID`                      | EAS project UUID                                                  |
| Variable | `ASC_APP_ID`                           | Numeric App Store Connect Apple ID; required only for iOS uploads |
| Variable | `EXPO_PUBLIC_SUPABASE_URL`             | Production Supabase project URL                                   |
| Variable | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable/anon key                                       |
| Variable | `EXPO_PUBLIC_API_URL`                  | Production HTTPS backend URL                                      |
| Variable | `EXPO_PUBLIC_PRIVACY_URL`              | Hosted privacy page                                               |
| Variable | `EXPO_PUBLIC_SUPPORT_URL`              | Hosted support page                                               |

The five public values must match the **Expo production environment**: GitHub uses them for preflight/bundle validation and Expo uses them for remote native builds. Never place a service-role key or other server secret in `EXPO_PUBLIC_*`. Store submission keys stay in EAS, so no `.p8` or Google service-account JSON is required in GitHub.

The workflow writes project/app IDs into the runner's checkout only; it does not commit them or change local configuration. If a project UUID is already committed and differs from the GitHub variable, release fails instead of switching projects silently.

## Run a release

Commit and push these workflow files to `main`, then:

1. Open **Actions → Mobile release → Run workflow**.
2. Select the branch/commit you intend to ship.
3. Choose `ios` for Apple only, `android` for Play only, or `all` for both.
4. iOS auto-submits to TestFlight and Android auto-submits to Google Play. There is no separate upload checkbox.
5. For Android, choose `internal` for testers or `production` for the public-release track. A production-track submission requests a completed release, subject to Google's review and your Play Console publishing settings.
6. Check each platform job and its build link in the Actions summary. Use TestFlight for iOS testing; submit the processed build for App Review when ready.

Only the manually dispatched release workflow receives credentials. Normal push/PR verification never publishes anything. No remote build or upload was initiated while preparing these files; account setup and a first authenticated pipeline run remain required.

## Sources

- [Expo builds on CI](https://docs.expo.dev/build/building-on-ci/)
- [App Store Connect API-key setup](https://docs.expo.dev/submit/ios/#automate-with-expo-workflows)
- [Google Play submission setup](https://docs.expo.dev/submit/android/)

## Credential setup: config command exits with code 1

If `eas credentials --platform ios` fails when running `expo config --json`, first run `APP_ENV=production npx expo config --json` inside this app folder to check configuration inspection. App metadata must be readable without deployment URLs: EAS selects the production environment even when it is only managing signing credentials.

Release settings are checked by `eas-build-pre-install`, the npm production export hooks, `npm run check:release`, and pipeline preflight. They are intentionally not checked by `app.config.js`. Missing production URLs still stop a real production build, but do not prevent generating certificates. After updating, rerun `eas credentials --platform ios` and select `production`.

## Automatic store submission

Use the [version utility](VERSIONING.md) to update the displayed release version and keep local native metadata aligned. The pipeline checks local consistency; EAS still owns and auto-increments store build numbers.

Every selected platform in **Mobile release** uses EAS auto-submit with the production submission profile. Android defaults to the internal testing track with a completed release; public production is selected explicitly through the workflow input. The App Store Connect API key must already be assigned in EAS and GitHub must have `ASC_APP_ID` configured. EAS uploads after a successful build, even if the GitHub connection later ends. Check the Expo submissions dashboard for upload status, then App Store Connect for processing and TestFlight availability. App Store review and public release remain separate.

To request the same behavior locally, from the mobile folder run:

```sh
npm run release:ios
npm run release:android
```

The local command can prompt for missing credentials/app information. It does not perform the GitHub-specific preflight or inject GitHub variables; configure the production environment and submission credentials first.

Reference: [Expo automatic submissions](https://docs.expo.dev/build/automate-submissions/).

## Store submission succeeds but GitHub reports a failure

`Expected one finished build...` came from our local post-build checker. EAS CLI 27.11's auto-submit path can return a previously cached build snapshot. The updated workflow uses the returned ID only as a reference, then queries `eas build:view <that-id> --json` in a fresh process. It still rejects errored, unfinished, mismatched or ambiguous builds. A checker failure does not cancel or undo a submission that the stores have already accepted.

`Google Service Account Keys cannot be set up in --non-interactive mode` is a separate credential lookup failure. In Expo Credentials for `@emmisart/allexibible`, select Android application `com.allexi.bible`, then assign your existing Google service account key under **Play Store submissions**, rather than only uploading an account-wide key or configuring FCM. The GitHub `EXPO_TOKEN` must have access to that project and its submission credentials. You can make this assignment interactively with `eas credentials --platform android`; CI cannot prompt for it. The new preflight reports this before starting another cloud build.

The notice that `android.package` is ignored when a native Android directory exists is informational. This project intentionally includes native code; the Gradle `applicationId` is authoritative. Release preparation checks it against Expo config and pins that identifier in the Android submit profile.

Commit and push the updated workflow, helper, tests and EAS configuration before starting the next release. GitHub runs the committed workflow, not uncommitted local changes. The old workflow had a separate Android `eas submit` step; the updated one has a single EAS auto-submit path per build. Do not rerun a release solely to correct the checkmark if its binaries are already accepted by the stores.

## Android DEX optimization

Android release builds enable R8 minification and resource shrinking in `android/gradle.properties`, using `proguard-android-optimize.txt` in the app Gradle file. The Expo plugin `plugins/withAndroidOptimization.cjs` preserves these settings during prebuild. Debug builds retain their normal development behavior. React Native and Expo supply consumer keep rules for their native entry points; avoid adding package-wide keep rules without a demonstrated runtime need.

Validate an optimized release before publishing: from `android/`, run `./gradlew :app:bundleRelease` (or `:app:assembleRelease` for a test APK). Smoke-test reading, chapter navigation, SQLite persistence, SecureStore and content refresh on a device. The local template uses debug signing; distribute through EAS production builds with the configured store credentials.

R8 writes diagnostics and `mapping.txt` under `android/app/build/outputs/mapping/release/`. AGP embeds the deobfuscation mapping in the AAB for Play; retain the mapping matching each released build. After pushing the changes, run the Android release workflow or `npm run release:android`. Play evaluates the newly uploaded bundle; these settings cannot change the scores of an existing upload. See [Android optimization guidance](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization) and [Play DEX metrics](https://developer.android.com/google/play/vitals/code-optimization).

## TestFlight encryption declaration

The current app uses platform HTTPS/keychain services and does not implement custom encryption algorithms. `ITSAppUsesNonExemptEncryption` is explicitly `false` in the tracked native `ios/AllexiBible/Info.plist` and in `expo.ios.infoPlist`; the Expo `ios.config.usesNonExemptEncryption` flag remains `false` as well. The native entry matters because this repository includes an iOS project, so cloud builds do not necessarily regenerate it from app.json.

This declaration is for the current encryption usage; reassess it if custom encryption is added. For the already uploaded build 2, complete its App Store Connect encryption questionnaire. Source changes cannot alter an existing uploaded binary. Push these changes and run a new iOS release for the declaration to be embedded in the next binary.

## Apple SDK warning ITMS-90725

Apple's notice for build 2 reports the iOS 26.2 SDK and a new iOS 27 SDK requirement starting April 2027. This is separate from encryption compliance. The app is on Expo SDK 55, whose default EAS image uses Xcode 26.2. Expo warns that Xcode 27 images require the UIKit scene lifecycle and advises older Expo SDKs to use their SDK-specific image. Do not change only the iOS deployment target or blindly pin `latest`: neither is a tested SDK/native migration.

The remaining work is an Expo/native upgrade with scene support, then choosing a documented Xcode 27+ image and testing a signed device build before uploading. The encryption fix does not resolve or claim to resolve this SDK warning.

References: [Apple encryption documentation](https://developer.apple.com/help/app-store-connect/manage-app-information/determine-and-upload-app-encryption-documentation/), [Expo build images and Xcode 27 compatibility](https://docs.expo.dev/build-reference/infrastructure/).


## iPhone and iPad support

Expo `ios.supportsTablet` is true and the tracked Xcode project sets `TARGETED_DEVICE_FAMILY = "1,2"` in Debug and Release. Keep both aligned because EAS builds the committed native project.

Production builds support iPhone and iPad natively. App Store Connect therefore requires iPad screenshots, including the 13-inch iPad display slot. Run `npm run release:ios` from `allexi_mobile/` (or dispatch the iOS release workflow) to build and upload changes, then select the processed build in App Store Connect. Source changes do not alter an already-uploaded binary.
