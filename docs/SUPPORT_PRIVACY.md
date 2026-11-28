# Support and privacy pages

Settings includes Support and Privacy screens on iOS, Android and web. Both are available without signing in or opening an external website. Contact actions open the user's email app, addressed to `Allexhairdrick@icloud.com`; deletion requests use the subject `Account deletion`. These actions open a draft, and do not send email automatically.

The shared content is in `src/data/help.json`. Update the support address or policy there, then run `npm run build:help` to refresh the standalone pages:

- `public/support/index.html`
- `public/privacy/index.html`
- `public/help.css` contains their shared styles.

`npm run export:web` and `npm run export:all` regenerate these pages and include them in the export. They need no login, JavaScript, cookies or third-party fonts. Both pages support narrow screens and the visitor's light/dark preference.

## Hosting for store listings

Host the contents of `public/` on your existing static website, or host the Expo web export. Preserve the directory structure so `/support/`, `/privacy/` and `/help.css` resolve. Configure the host to serve directory `index.html` files before any single-page application fallback. Test both URLs in a signed-out browser.

On Expo Hosting, use the trailing slash in both public URLs: `https://YOUR_HOST.expo.app/support/` and `https://YOUR_HOST.expo.app/privacy/`. Without the slash, the current single-page export serves the reader's `index.html` instead of the directory's page, even though the response is HTTP 200. The explicit `/support/index.html` and `/privacy/index.html` URLs also work. Check the HTML title and content, not only the response code.

The deployed pages were verified at `https://allexibible.expo.app/support/` and `https://allexibible.expo.app/privacy/`. Use these exact URLs (including the final slash) in App Store Connect, Google Play, EAS and GitHub environment variables. The production Expo alias keeps these store links stable across deployments.

Set `EXPO_PUBLIC_SUPPORT_URL` and `EXPO_PUBLIC_PRIVACY_URL` to those public HTTPS URLs in EAS production and GitHub's production environment, and use the same URLs in App Store Connect and Google Play Console. The files are ready locally; this change does not publish a website.

Before store publication, the operator should confirm the privacy copy against its actual hosting, email providers and backup retention arrangements. The existing backend data-practice notes are in `../allexi_backend/docs/PRIVACY.md` relative to the mobile project. Keep the public policy revision date current when practices change.

Login and account deletion in Settings are available to approved administrators in the browser web app. The installed iOS and Android app has no sign-in, signup, admin workspace or study sync. Published content updates continue without authentication. Support and Privacy remain accessible on every platform.
