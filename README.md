# Allexi Bible mobile

Standalone Expo / React Native app. Install Node.js 24, then run:

```sh
npm ci
npm start
```

Build a development app with `npm run ios` (macOS/Xcode) or `npm run android` (Android SDK/JDK). Rebuild after adding native modules. Production uses the `production` profile in `eas.json`.

[GitHub Actions build and store upload setup](docs/CI_CD.md) explains how to build iOS, Android, or both, and optionally upload the exact builds to App Store Connect/TestFlight or Google Play. The workflows live in this repository's `.github/workflows/` directory.

Copy `.env.example` to `.env` for development. Production requires real HTTPS Supabase/API/privacy/support URLs and a public Supabase key. Account credentials and store signing keys are configured through Expo and GitHub secrets, not committed to the repository.

```sh
npm run typecheck
npm run test:release
npm run export:all
```
