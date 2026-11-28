# Version and build-number utility

Run these commands inside `allexi_mobile/`. The utility works on macOS, Windows and Linux without Xcode, Android Studio or additional packages.

```sh
# Increment both local build counters; keep the displayed version.
npm run version:bump

# Increment the displayed patch version and both local build counters.
npm run version:bump -- patch

# Other displayed-version increments.
npm run version:bump -- minor
npm run version:bump -- major

# Preview changes without writing any files.
npm run version:bump -- patch --dry-run

# Set an explicit version and higher platform counters.
npm run version:bump -- --version 1.0.0 --ios-build 20 --android-code 25

# Align local files without incrementing, or verify they already agree.
npm run version:sync
npm run version:check
```

A build-only bump changes, for example, version `0.1.0`, iOS build `1`, Android code `1` into version `0.1.0`, iOS build `2`, Android code `2`. A patch bump produces version `0.1.1` with those incremented counters. Each platform increments independently from the highest counter currently present in its local files. Build numbers do not reset on a new displayed version.

The utility updates:

- `app.json`: `expo.version`, `expo.ios.buildNumber`, `expo.android.versionCode`.
- `package.json` and both root-package version entries in `package-lock.json`.
- `android/app/build.gradle`: `versionName` and `versionCode`.
- `ios/AllexiBible/Info.plist`: `CFBundleShortVersionString` and `CFBundleVersion`.
- `ios/AllexiBible.xcodeproj/project.pbxproj`: `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in Debug and Release.

About and Settings read the displayed version from Expo config, so there is no duplicate release string to edit. The utility preserves Info.plist references to Xcode build settings if those references are introduced later. It validates every file before writing, stages changes before replacing files, and restores already-written files if a write fails. It rejects version downgrades, malformed native fields, non-increasing bump counters and Android codes over 2,100,000,000. Store-facing versions use numeric `major.minor.patch`; iOS build counters use positive integers.

## EAS cloud builds

This project retains `cli.appVersionSource: remote` and production `autoIncrement: true`. EAS remains authoritative for store build counters and ignores local build-number fields when producing remote builds. The utility manages local source metadata; it does not update EAS servers or query the highest build uploaded to either store. Local files cannot prove which store build number was most recently used.

Use the utility to bump the **displayed version** before release, then commit the updated files. EAS independently increments its existing iOS/Android counters when the production pipeline builds. Do not turn off remote auto-increment just to use this utility.

To bring remote counters into native files after an EAS build, run:

```sh
npm run version:pull
```

This runs `eas build:version:sync --platform all --profile production`, then aligns the other local files. It requires access to the linked Expo project and initialized remote counters for both platforms. Sync retains any higher local counter rather than decreasing it. To initialize or change EAS's remote baseline, use `eas build:version:set` with the last build number used in the stores.

The utility does not change `eas.json`, sign, upload, publish or submit an app. `version:check` runs in mobile verification and before store builds. Utility tests run with `npm run test:version`.

Reference: [Expo app version management](https://docs.expo.dev/build-reference/app-versions/).
