# Support, Privacy and Terms pages

Settings includes Support, Privacy policy and Terms of Service screens on iOS, Android and web. All are available without signing in. Contact actions open a draft in the user's email app, addressed to `Allexhairdrick@icloud.com`; account-deletion requests use the subject `Account deletion`.

The shared content is in `src/data/help.json`. Update the text there, then run `npm run build:help` to regenerate:

- `public/support/index.html` and `public/support.html`
- `public/privacy/index.html` and `public/privacy.html`
- `public/terms/index.html` and `public/terms.html`

`public/help.css` supplies their shared styles. Every page links to the reader and the other help/legal pages. The directory pages and flat HTML aliases contain full HTML and do not require login, cookies, third-party fonts or application startup.

## Routing and hosting

The website supports `/support`, `/privacy` and `/terms`, with or without a trailing slash. The flat HTML files support clean-URL hosts. If a host falls back to the reader's single-page HTML for a slashless path, the web entry redirects to the matching static directory page before mounting the app. It preserves query strings and anchors and does not redirect the reader root or unrelated paths. Native startup is unchanged.

The earlier export had only directory pages. On Expo Hosting, a URL without its final slash could therefore serve the reader rather than the requested page, even with HTTP 200. Re-export and redeploy to install the route fix; changing environment variables alone does not update an existing deployment.

Production links:

- `https://allexibible.expo.app/support`
- `https://allexibible.expo.app/privacy`
- `https://allexibible.expo.app/terms`

The trailing-slash and explicit `index.html` forms continue to work. Existing support/privacy environment values may retain their canonical trailing slashes.

From the mobile project, deploy to the linked Expo project's production alias with:

```sh
npm run deploy:web
```

This exports current web code and generated pages into ignored `.expo/web-release/`, then runs Expo Hosting deployment. It does not build or submit native store binaries. You must be signed into Expo with access to the linked project, and local public environment values must point to production services. For another static host, publish the exported files and preserve their structure; configure directory index files before the SPA fallback.

Set store-listing support/privacy URLs and EAS/GitHub production public variables to the production domain. No new required environment variable is needed for Terms. In-app Terms becomes available in the next native build containing this change.

## Content and verification

The Terms page describes current reader/admin behavior, acceptable use, editorial submissions, third-party rights, availability, privacy and the real support contact. It does not invent a legal company name, jurisdiction or retention period. The app operator should review public legal text against its own identity, distribution arrangements and actual service practices before relying on it.

Run `npm run test:help` for routing and generated-page checks, `npm run typecheck` for native/web screen integration, and `npm run export:web` for the deployable bundle. Verify the title, text and links of each live page, rather than checking only for HTTP 200.
