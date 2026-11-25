# Build and store upload pipeline

The mobile repository is `Neba-Emmanuel/allexi_mobile`. Its GitHub Actions files live in this app's `.github/workflows/`, not the parent project's `.github/` directory. All commands below run inside this mobile folder. There is no root npm workspace and the backend is not needed by these workflows.

## What runs

- **Verify mobile:** every push and pull request installs dependencies, checks TypeScript, tests release configuration and exports all three JavaScript bundles. No store credentials are needed.
- **Mobile release:** manually run from GitHub Actions. Choose `ios`, `android` or `all`; choose whether to upload. Default is **iOS build only**. Google Play defaults to the **internal** track, with an explicit production option. iOS uploads go to App Store Connect/TestFlight. Apple App Review and public release are separate.
- Each selected platform gets its own EAS cloud build. GitHub waits for a successful build, then uploads that exact build ID if requested. It never selects an unrelated “latest” build. Upload failures fail the job. Successful store upload does not mean Apple/Google processing or review is complete.
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

For Android, create the Play Console app and configure a **Google service account key for Play Store submissions** in EAS. Google requires the first app upload manually before API submissions work. Complete account/testing requirements before selecting a production rollout.

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
4. Enable **Upload successful builds** to send to the stores; leave it disabled for signed builds only.
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
